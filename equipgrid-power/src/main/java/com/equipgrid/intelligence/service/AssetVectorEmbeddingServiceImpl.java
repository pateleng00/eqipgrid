package com.equipgrid.intelligence.service;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.enums.AssetCategory;
import com.equipgrid.asset.repository.AssetQueryRepository;
import com.equipgrid.asset.repository.AssetRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AssetVectorEmbeddingServiceImpl implements IAssetVectorEmbeddingService {

  private static final HttpClient HTTP_CLIENT =
      HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();

  private static final String EMBEDDING_MODEL = "models/gemini-embedding-001";
  private static final int EMBEDDING_DIMENSION = 768;

  private final AssetRepository assetRepository;
  private final AssetQueryRepository assetQueryRepository;
  private final JdbcTemplate jdbcTemplate;
  private final ObjectMapper objectMapper;

  @Value("${equipgrid.intelligence.gemini.api-key:}")
  private String configuredGeminiApiKey;

  @Override
  public String buildAssetEmbeddingText(Asset asset) {
    if (asset == null) return "";
    StringBuilder sb = new StringBuilder();

    sb.append("Asset Name: ").append(asset.getName()).append("\n");
    if (asset.getAssetTag() != null) {
      sb.append("Asset Tag: ").append(asset.getAssetTag()).append("\n");
    }
    if (asset.getHindiName() != null) {
      sb.append("Hindi Name (हिंदी नाम): ").append(asset.getHindiName()).append("\n");
    }
    if (asset.getLocalLanguageName() != null) {
      sb.append("Local Name: ").append(asset.getLocalLanguageName()).append("\n");
    }
    if (asset.getCategory() != null) {
      sb.append("Category: ")
          .append(asset.getCategory().name())
          .append(" - ")
          .append(asset.getCategory().getDescription())
          .append("\n");
    }
    if (asset.getType() != null) {
      sb.append("Equipment Type: ").append(asset.getType().getName());
      if (asset.getType().getHindiName() != null) {
        sb.append(" (").append(asset.getType().getHindiName()).append(")");
      }
      sb.append("\n");
      if (asset.getType().getDescription() != null) {
        sb.append("Type Purpose: ").append(asset.getType().getDescription()).append("\n");
      }
      if (asset.getType().getHindiDescription() != null) {
        sb.append("Hindi Description: ").append(asset.getType().getHindiDescription()).append("\n");
      }
    }
    if (asset.getManufacturer() != null) {
      sb.append("Manufacturer: ").append(asset.getManufacturer().getName()).append("\n");
    }
    if (asset.getModel() != null) {
      sb.append("Machine Model: ").append(asset.getModel().getName());
      if (asset.getModel().getModelNumber() != null) {
        sb.append(" [Model No: ").append(asset.getModel().getModelNumber()).append("]");
      }
      sb.append("\n");
      if (asset.getModel().getSpecs() != null) {
        sb.append("Technical Specs: ").append(asset.getModel().getSpecs()).append("\n");
      }
    }
    if (asset.getHub() != null) {
      sb.append("Station Yard Hub: ").append(asset.getHub().getName());
      if (asset.getHub().getCity() != null) {
        sb.append(", City: ").append(asset.getHub().getCity().getName());
      }
      if (asset.getHub().getAddress() != null) {
        sb.append(", Address: ").append(asset.getHub().getAddress());
      }
      sb.append("\n");
    }
    if (asset.getDailyRate() != null) {
      sb.append("Rental Tariff: ₹").append(asset.getDailyRate()).append(" per day\n");
    }
    if (asset.getDepositAmount() != null) {
      sb.append("Refundable Deposit: ₹").append(asset.getDepositAmount()).append("\n");
    }
    if (asset.getShiftTerms() != null) {
      sb.append("Terms & Shifts: ").append(asset.getShiftTerms()).append("\n");
    }
    if (asset.getConditionNotes() != null) {
      sb.append("Condition: ").append(asset.getConditionNotes()).append("\n");
    }
    if (asset.getAccessoriesIncluded() != null) {
      sb.append("Included Attachments: ").append(asset.getAccessoriesIncluded()).append("\n");
    }

    // Add comprehensive English & Hindi domain search keywords
    sb.append("Use Cases & Tasks: ");
    if (asset.getCategory() == AssetCategory.AGRICULTURE) {
      sb.append(
          "khet jotaai, rotavator, mb plough, kisan, fasal, gehu, dhan, sugarcane, ganna, katai, nirai, gudai, weeding, harvesting, ploughing, field tillage, seedbed preparation, rotavator attachment, खेत, किसान, जुताई, कटाई, निराई, गुड़ाई, रोटावेटर, ट्रैक्टर, फसल");
    } else if (asset.getCategory() == AssetCategory.CONSTRUCTION) {
      sb.append(
          "nirman, chhat casting, roof slab, dhalaai, cement mixing, concrete, vibrator, compactor, roadi, moram, site civil work, demolition, breaker, dewatering pump, water drainage, compaction, कंक्रीट, ढलाई, मिक्सर, वाइब्रेटर, कंपैक्टर, रोलर, निर्माण, सीमेंट");
    } else {
      sb.append(
          "dual-use fleet, tractor trolley, tipping trailer, transport haulage, agricultural logistics, construction material loading, backhoe loader, excavation, earthmoving, portable silent generator, power backup, ढुलाई, ट्राली, ट्रेलर, लोडर, जनरेटर, खुदाई");
    }
    sb.append("\n");

    return sb.toString();
  }

  @Override
  public float[] generateEmbedding(String text) {
    if (StringUtils.isBlank(text)) return null;

    String apiKey = resolveGeminiApiKey();
    if (StringUtils.isBlank(apiKey)) {
      log.warn("[AssetVectorEmbedding] No Gemini API key available to generate vector embedding.");
      return null;
    }

    try {
      String endpoint =
          "https://generativelanguage.googleapis.com/v1beta/"
              + EMBEDDING_MODEL
              + ":embedContent?key="
              + apiKey;

      ObjectNode root = objectMapper.createObjectNode();
      root.put("model", EMBEDDING_MODEL);
      ObjectNode content = root.putObject("content");
      ArrayNode parts = content.putArray("parts");
      parts.addObject().put("text", text);
      root.put("outputDimensionality", EMBEDDING_DIMENSION);

      String jsonPayload = objectMapper.writeValueAsString(root);

      HttpRequest request =
          HttpRequest.newBuilder()
              .uri(URI.create(endpoint))
              .header("Content-Type", "application/json")
              .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
              .timeout(Duration.ofSeconds(20))
              .build();

      HttpResponse<String> response =
          HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());

      if (response.statusCode() >= 200 && response.statusCode() < 300) {
        JsonNode responseJson = objectMapper.readTree(response.body());
        JsonNode valuesNode = responseJson.path("embedding").path("values");
        if (valuesNode.isArray() && valuesNode.size() == EMBEDDING_DIMENSION) {
          float[] vector = new float[EMBEDDING_DIMENSION];
          for (int i = 0; i < EMBEDDING_DIMENSION; i++) {
            vector[i] = (float) valuesNode.get(i).asDouble();
          }
          return vector;
        } else {
          log.warn(
              "[AssetVectorEmbedding] Unexpected vector dimension returned: {}", valuesNode.size());
        }
      } else {
        log.warn(
            "[AssetVectorEmbedding] Gemini embedContent returned HTTP {}: {}",
            response.statusCode(),
            response.body());
      }
    } catch (Exception e) {
      log.error(
          "[AssetVectorEmbedding] Exception while generating embedding: {}", e.getMessage(), e);
    }
    return null;
  }

  @Override
  @Transactional
  public int syncAllAssetEmbeddings() {
    if (!isPostgreSql()) {
      log.info("[AssetVectorEmbedding] Non-PostgreSQL database detected; skipping vector sync.");
      return 0;
    }

    List<Asset> allAssets = assetQueryRepository.fetchAssets(null, null);
    if (allAssets == null || allAssets.isEmpty()) {
      log.info("[AssetVectorEmbedding] No assets found to embed.");
      return 0;
    }

    log.info(
        "[AssetVectorEmbedding] Starting batch vector generation for {} assets...",
        allAssets.size());
    int successCount = 0;

    for (Asset asset : allAssets) {
      try {
        String docText = buildAssetEmbeddingText(asset);
        float[] vector = generateEmbedding(docText);
        if (vector != null && vector.length == EMBEDDING_DIMENSION) {
          String vectorStr = formatVectorForPostgres(vector);
          jdbcTemplate.update(
              "UPDATE assets SET embedding = CAST(? AS vector) WHERE id = ?",
              vectorStr,
              asset.getId());
          successCount++;
          log.info(
              "[AssetVectorEmbedding] Generated and saved vector for asset ID={} ('{}')",
              asset.getId(),
              asset.getName());
        }
      } catch (Exception e) {
        log.error(
            "[AssetVectorEmbedding] Failed to generate embedding for asset ID={}: {}",
            asset.getId(),
            e.getMessage());
      }
    }

    log.info(
        "[AssetVectorEmbedding] Batch embedding completed. Successfully synced {}/{} assets.",
        successCount,
        allAssets.size());
    return successCount;
  }

  @Override
  @Transactional
  public boolean updateAssetEmbedding(Long assetId) {
    if (assetId == null || !isPostgreSql()) return false;

    Optional<Asset> opt = assetQueryRepository.fetchById(assetId);
    if (opt.isEmpty()) return false;

    Asset asset = opt.get();
    String docText = buildAssetEmbeddingText(asset);
    float[] vector = generateEmbedding(docText);
    if (vector != null && vector.length == EMBEDDING_DIMENSION) {
      String vectorStr = formatVectorForPostgres(vector);
      jdbcTemplate.update(
          "UPDATE assets SET embedding = CAST(? AS vector) WHERE id = ?", vectorStr, asset.getId());
      return true;
    }
    return false;
  }

  @Override
  public List<Asset> searchAssetsByVector(
      String query, AssetCategory category, Long hubId, int limit) {
    if (StringUtils.isBlank(query) || !isPostgreSql() || limit <= 0) {
      return Collections.emptyList();
    }

    float[] queryVec = generateEmbedding(query);
    if (queryVec == null) {
      return Collections.emptyList();
    }

    String vectorStr = formatVectorForPostgres(queryVec);
    Short catValue = category != null ? category.getValue() : null;

    String sql =
        """
                        SELECT id, 1 - (embedding <=> CAST(? AS vector)) AS similarity
                        FROM assets
                        WHERE embedding IS NOT NULL
                          AND status = 1
                          AND (? IS NULL OR category = ?)
                          AND (? IS NULL OR hub_id = ?)
                        ORDER BY embedding <=> CAST(? AS vector)
                        LIMIT ?
                        """;

    try {
      List<Long> matchedIds =
          jdbcTemplate.query(
              sql,
              (rs, rowNum) -> rs.getLong("id"),
              vectorStr,
              catValue,
              catValue,
              hubId,
              hubId,
              vectorStr,
              limit);

      if (matchedIds.isEmpty()) {
        return Collections.emptyList();
      }

      List<Asset> assets = assetRepository.findAllById(matchedIds);
      Map<Long, Asset> assetMap = assets.stream().collect(Collectors.toMap(Asset::getId, a -> a));

      List<Asset> ordered = new ArrayList<>();
      for (Long id : matchedIds) {
        if (assetMap.containsKey(id)) {
          ordered.add(assetMap.get(id));
        }
      }
      return ordered;
    } catch (Exception e) {
      log.warn("[AssetVectorEmbedding] Vector search query failed: {}", e.getMessage());
      return Collections.emptyList();
    }
  }

  private String formatVectorForPostgres(float[] vector) {
    StringBuilder sb = new StringBuilder(vector.length * 9 + 2);
    sb.append('[');
    for (int i = 0; i < vector.length; i++) {
      if (i > 0) sb.append(',');
      sb.append(vector[i]);
    }
    sb.append(']');
    return sb.toString();
  }

  private boolean isPostgreSql() {
    try {
      if (jdbcTemplate.getDataSource() == null) return false;
      String dbName =
          jdbcTemplate.getDataSource().getConnection().getMetaData().getDatabaseProductName();
      return dbName != null && dbName.toLowerCase(Locale.ROOT).contains("postgres");
    } catch (Exception e) {
      return false;
    }
  }

  private String resolveGeminiApiKey() {
    String envKey = System.getenv("GEMINI_API_KEY");
    if (StringUtils.isNotBlank(envKey)) {
      return envKey.trim();
    }
    if (StringUtils.isNotBlank(configuredGeminiApiKey)
        && !"AIzaSyALaFipN7rgB6apqXKznEYrUFBDhdFkG4Q".equals(configuredGeminiApiKey.trim())) {
      return configuredGeminiApiKey.trim();
    }
    String dotenvKey = findKeyInDotenv("GEMINI_API_KEY");
    if (StringUtils.isNotBlank(dotenvKey)) {
      return dotenvKey.trim();
    }
    return null;
  }

  private String findKeyInDotenv(String key) {
    try {
      Path[] candidatePaths =
          new Path[] {Paths.get(".env"), Paths.get("../.env"), Paths.get("../../.env")};
      for (Path path : candidatePaths) {
        if (Files.exists(path)) {
          List<String> lines = Files.readAllLines(path);
          for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.startsWith(key + "=")) {
              String val = trimmed.substring((key + "=").length()).trim();
              if ((val.startsWith("\"") && val.endsWith("\""))
                  || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.substring(1, val.length() - 1);
              }
              return val;
            }
          }
        }
      }
    } catch (Exception ignored) {
    }
    return null;
  }
}
