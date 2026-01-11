package com.adityachandel.booklore.controller;

import com.adityachandel.booklore.model.dto.EpubStructureDto;
import com.adityachandel.booklore.service.reader.EpubReaderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reader/epub")
@AllArgsConstructor
@Tag(name = "EPUB Reader", description = "Endpoints for reading EPUB files")
public class EpubReaderController {

    private final EpubReaderService epubReaderService;

    @GetMapping("/{bookId}/structure")
    @Operation(summary = "Get EPUB file structure", description = "Returns the directory structure of an EPUB file without extracting it")
    public ResponseEntity<EpubStructureDto> getEpubStructure(@PathVariable Long bookId) {
        EpubStructureDto structure = epubReaderService.getEpubStructure(bookId);
        return ResponseEntity.ok(structure);
    }
}

