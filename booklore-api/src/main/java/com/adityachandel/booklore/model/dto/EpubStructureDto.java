package com.adityachandel.booklore.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EpubStructureDto {
    private String rootPath;
    private List<EpubEntry> entries;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EpubEntry {
        private String path;
        private boolean isDirectory;
        private long size;
    }
}

