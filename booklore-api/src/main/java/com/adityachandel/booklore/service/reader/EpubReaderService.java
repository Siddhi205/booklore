package com.adityachandel.booklore.service.reader;

import com.adityachandel.booklore.exception.ApiError;
import com.adityachandel.booklore.model.dto.EpubStructureDto;
import com.adityachandel.booklore.model.entity.BookEntity;
import com.adityachandel.booklore.repository.BookRepository;
import com.adityachandel.booklore.util.FileUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.compress.archivers.zip.ZipArchiveEntry;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class EpubReaderService {

    private static final String EPUB_EXTENSION = ".epub";
    private static final Charset[] ENCODINGS_TO_TRY = {
            StandardCharsets.UTF_8,
            Charset.forName("Shift_JIS"),
            StandardCharsets.ISO_8859_1,
            Charset.forName("CP437"),
            Charset.forName("MS932")
    };
    private static final int MAX_CACHE_ENTRIES = 50;

    private final BookRepository bookRepository;
    private final Map<String, CachedEpubMetadata> epubCache = new ConcurrentHashMap<>();

    private static class CachedEpubMetadata {
        final List<EpubStructureDto.EpubEntry> entries;
        final long lastModified;
        final Charset successfulEncoding;
        volatile long lastAccessed;

        CachedEpubMetadata(List<EpubStructureDto.EpubEntry> entries, long lastModified, Charset successfulEncoding) {
            this.entries = List.copyOf(entries);
            this.lastModified = lastModified;
            this.successfulEncoding = successfulEncoding;
            this.lastAccessed = System.currentTimeMillis();
        }
    }

    public EpubStructureDto getEpubStructure(Long bookId) {
        Path epubPath = getBookPath(bookId);
        try {
            CachedEpubMetadata metadata = getCachedMetadata(epubPath);
            return new EpubStructureDto("EPUB/", metadata.entries);
        } catch (IOException e) {
            log.error("Failed to read EPUB structure for book {}", bookId, e);
            throw ApiError.FILE_READ_ERROR.createException("Failed to read EPUB structure: " + e.getMessage());
        }
    }

    private Path getBookPath(Long bookId) {
        BookEntity bookEntity = bookRepository.findById(bookId)
                .orElseThrow(() -> ApiError.BOOK_NOT_FOUND.createException(bookId));
        String bookFullPath = FileUtils.getBookFullPath(bookEntity);
        Path path = Path.of(bookFullPath);

        if (!path.getFileName().toString().toLowerCase().endsWith(EPUB_EXTENSION)) {
            throw ApiError.FILE_READ_ERROR.createException("Not an EPUB file");
        }

        return path;
    }

    private CachedEpubMetadata getCachedMetadata(Path epubPath) throws IOException {
        String cacheKey = epubPath.toString();
        long currentModified = Files.getLastModifiedTime(epubPath).toMillis();

        CachedEpubMetadata cached = epubCache.get(cacheKey);
        if (cached != null && cached.lastModified == currentModified) {
            cached.lastAccessed = System.currentTimeMillis();
            log.debug("Cache hit for EPUB: {}", epubPath.getFileName());
            return cached;
        }

        log.debug("Cache miss for EPUB: {}, scanning...", epubPath.getFileName());
        CachedEpubMetadata newMetadata = scanEpubMetadata(epubPath);
        epubCache.put(cacheKey, newMetadata);
        evictOldestCacheEntries();
        return newMetadata;
    }

    private CachedEpubMetadata scanEpubMetadata(Path epubPath) throws IOException {
        long lastModified = Files.getLastModifiedTime(epubPath).toMillis();

        // Try cached encoding first
        String cacheKey = epubPath.toString();
        CachedEpubMetadata oldCache = epubCache.get(cacheKey);
        if (oldCache != null && oldCache.successfulEncoding != null) {
            try {
                List<EpubStructureDto.EpubEntry> entries = getEntriesFromEpubWithEncoding(epubPath, oldCache.successfulEncoding, true);
                return new CachedEpubMetadata(entries, lastModified, oldCache.successfulEncoding);
            } catch (Exception e) {
                log.debug("Cached encoding {} failed, trying others", oldCache.successfulEncoding);
            }
        }

        // Try all encodings
        for (Charset encoding : ENCODINGS_TO_TRY) {
            try {
                List<EpubStructureDto.EpubEntry> entries = getEntriesFromEpubWithEncoding(epubPath, encoding, true);
                return new CachedEpubMetadata(entries, lastModified, encoding);
            } catch (Exception e) {
                log.debug("EPUB fast path failed for encoding {}: {}", encoding, e.getMessage());
            }
            try {
                List<EpubStructureDto.EpubEntry> entries = getEntriesFromEpubWithEncoding(epubPath, encoding, false);
                return new CachedEpubMetadata(entries, lastModified, encoding);
            } catch (Exception e) {
                log.debug("EPUB slow path failed for encoding {}: {}", encoding, e.getMessage());
            }
        }

        throw new IOException("Unable to read EPUB archive with any supported encoding");
    }

    private List<EpubStructureDto.EpubEntry> getEntriesFromEpubWithEncoding(Path epubPath, Charset charset, boolean useFastPath) throws IOException {
        try (org.apache.commons.compress.archivers.zip.ZipFile zipFile =
                     org.apache.commons.compress.archivers.zip.ZipFile.builder()
                             .setPath(epubPath)
                             .setCharset(charset)
                             .setUseUnicodeExtraFields(true)
                             .setIgnoreLocalFileHeader(useFastPath)
                             .get()) {

            List<EpubStructureDto.EpubEntry> entries = new ArrayList<>();
            Enumeration<ZipArchiveEntry> enumeration = zipFile.getEntries();

            while (enumeration.hasMoreElements()) {
                ZipArchiveEntry entry = enumeration.nextElement();
                String entryName = entry.getName();

                // Normalize path separators
                entryName = entryName.replace('\\', '/');

                entries.add(new EpubStructureDto.EpubEntry(
                        entryName,
                        entry.isDirectory(),
                        entry.getSize()
                ));
            }

            // Sort entries for consistent output
            entries.sort(Comparator.comparing(EpubStructureDto.EpubEntry::getPath));

            return entries;
        }
    }

    private void evictOldestCacheEntries() {
        if (epubCache.size() <= MAX_CACHE_ENTRIES) {
            return;
        }

        List<String> keysToRemove = epubCache.entrySet().stream()
                .sorted(Comparator.comparingLong(e -> e.getValue().lastAccessed))
                .limit(epubCache.size() - MAX_CACHE_ENTRIES)
                .map(Map.Entry::getKey)
                .toList();

        keysToRemove.forEach(key -> {
            epubCache.remove(key);
            log.debug("Evicted EPUB cache entry: {}", key);
        });
    }
}
