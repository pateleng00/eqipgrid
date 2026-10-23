package com.equipgrid.intelligence.controller;

import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.core.botshield.RequireBotShield;
import com.equipgrid.core.ratelimiter.RateLimited;
import com.equipgrid.intelligence.dto.request.IntelligenceChatRequest;
import com.equipgrid.intelligence.dto.response.IntelligenceChatResponse;
import com.equipgrid.intelligence.service.IAssetVectorEmbeddingService;
import com.equipgrid.intelligence.service.IIntelligenceChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/intelligence")
@RequiredArgsConstructor
@Tag(
    name = "Intelligence Service",
    description =
        "In-place website AI Copilot driven by backend Gemini AI and EquipGrid knowledge engine")
public class IntelligenceChatController {

  private final IIntelligenceChatService intelligenceChatService;
  private final IAssetVectorEmbeddingService assetVectorEmbeddingService;

  @Operation(
      summary = "Chat with Kisan Mitra Intelligence Assistant",
      description =
          "Answers user questions using website data and Gemini AI, finds machinery, and facilitates booking")
  @PostMapping("/chat")
  @RequireBotShield
  @RateLimited(name = "intelligence_chat")
  public ResponseEntity<ApiResponse<IntelligenceChatResponse>> chat(
      @Valid @RequestBody IntelligenceChatRequest request) {
    log.info("Received Intelligence chat request: message='{}'", request.getMessage());
    IntelligenceChatResponse response = intelligenceChatService.chat(request);
    return ResponseEntity.ok(ApiResponse.buildSuccess(response));
  }

  @Operation(
      summary = "Sync all asset vector embeddings",
      description =
          "Batch generates 768-dimensional embeddings for all assets and stores them in PostgreSQL pgvector")
  @PostMapping("/embeddings/sync")
  public ResponseEntity<ApiResponse<Map<String, Object>>> syncEmbeddings() {
    log.info("Received request to sync all asset vector embeddings");
    int count = assetVectorEmbeddingService.syncAllAssetEmbeddings();
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            Map.of(
                "syncedCount",
                count,
                "message",
                "Successfully generated and stored embeddings for " + count + " assets")));
  }
}
