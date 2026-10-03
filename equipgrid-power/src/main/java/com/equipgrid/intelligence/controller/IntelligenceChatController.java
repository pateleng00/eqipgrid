package com.equipgrid.intelligence.controller;

import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.intelligence.dto.request.IntelligenceChatRequest;
import com.equipgrid.intelligence.dto.response.IntelligenceChatResponse;
import com.equipgrid.intelligence.service.IIntelligenceChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/intelligence")
@RequiredArgsConstructor
@Tag(name = "Intelligence Service", description = "In-place website AI Copilot driven by backend Gemini AI and EquipGrid knowledge engine")
public class IntelligenceChatController {

    private final IIntelligenceChatService intelligenceChatService;

    @Operation(summary = "Chat with EquipGrid Intelligence Assistant", description = "Answers user questions using website data and Gemini AI, finds machinery, and facilitates booking")
    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<IntelligenceChatResponse>> chat(@Valid @RequestBody IntelligenceChatRequest request) {
        log.info("Received Intelligence chat request: message='{}'", request.getMessage());
        IntelligenceChatResponse response = intelligenceChatService.chat(request);
        return ResponseEntity.ok(ApiResponse.buildSuccess(response));
    }
}
