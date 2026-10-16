package com.equipgrid.intelligence.service;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.enums.AssetCategory;
import com.equipgrid.asset.enums.AssetStatus;
import com.equipgrid.asset.repository.AssetQueryRepository;
import com.equipgrid.intelligence.dto.model.EquipmentCardDto;
import com.equipgrid.intelligence.dto.model.IntelligenceChatMessage;
import com.equipgrid.intelligence.dto.request.IntelligenceChatRequest;
import com.equipgrid.intelligence.dto.response.IntelligenceChatResponse;
import com.equipgrid.intelligence.tool.FleetIntelligenceTools;
import com.equipgrid.location.entity.Hub;
import com.equipgrid.location.repository.HubRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class IntelligenceChatServiceImpl implements IIntelligenceChatService {
  @Value("${equipgrid.intelligence.gemini.api-key}")
  private String configuredGeminiApiKey;

  @Value("${equipgrid.intelligence.gemini.model}")
  private String geminiModel;

  private static final HttpClient HTTP_CLIENT =
      HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(20)).build();
  private final AssetQueryRepository assetQueryRepository;
  private final HubRepository hubRepository;
  private final ObjectMapper objectMapper;
  private final FleetIntelligenceTools fleetIntelligenceTools;

  @Override
  public IntelligenceChatResponse chat(IntelligenceChatRequest request) {
    String userMessage = request.getMessage().trim();
    List<Asset> allAssets = fetchAllAvailableAssets();
    List<Hub> allHubs = hubRepository.findAll();
    List<EquipmentCardDto> matchedCards = new ArrayList<>();

    // 1. Try calling Gemini AI with Live MCP-style Tools & Function Calling
    String apiKey = resolveGeminiApiKey();
    if (StringUtils.isNotBlank(apiKey)) {
      try {
        String geminiReply =
            callGeminiApi(
                apiKey,
                userMessage,
                request.getConversationHistory(),
                allAssets,
                allHubs,
                matchedCards);
        if (StringUtils.isNotBlank(geminiReply)) {
          // If function calls didn't match equipment cards, use keyword heuristic
          if (matchedCards.isEmpty()) {
            matchedCards.addAll(matchEquipmentToQuery(userMessage, allAssets));
          }

          return IntelligenceChatResponse.builder()
              .reply(geminiReply)
              .modelUsed("EquipBot AI (Gemini + Live Fleet Tools)")
              .matchedEquipment(matchedCards)
              .suggestedQuestions(buildDynamicSuggestions(userMessage, matchedCards))
              .primaryActionUrl(determinePrimaryAction(matchedCards))
              .primaryActionLabel(
                  matchedCards.isEmpty()
                      ? "Explore All Machinery"
                      : "Book " + matchedCards.get(0).getName())
              .timestamp(System.currentTimeMillis())
              .build();
        }
      } catch (Exception e) {
        log.warn(
            "[Gemini AI] Call threw exception, falling back to local domain intelligence: {}",
            e.getMessage(),
            e);
      }
    } else {
      log.info("[Gemini AI] No valid API key configured; using EquipGrid Domain Knowledge Engine");
    }

    // 2. Fallback: Local domain-driven AI knowledge engine
    matchedCards.addAll(matchEquipmentToQuery(userMessage, allAssets));
    String localReply = generateLocalDomainReply(userMessage, allAssets, allHubs, matchedCards);
    return IntelligenceChatResponse.builder()
        .reply(localReply)
        .modelUsed("EquipBot Assistant (Local Knowledge)")
        .matchedEquipment(matchedCards)
        .suggestedQuestions(buildDynamicSuggestions(userMessage, matchedCards))
        .primaryActionUrl(determinePrimaryAction(matchedCards))
        .primaryActionLabel(matchedCards.isEmpty() ? "Browse Equipment Fleet" : "Book Machine Now")
        .timestamp(System.currentTimeMillis())
        .build();
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
              if (StringUtils.isNotBlank(val)) {
                return val;
              }
            }
          }
        }
      }
    } catch (Exception ignored) {
    }
    return null;
  }

  private String callGeminiApi(
      String apiKey,
      String userMessage,
      List<IntelligenceChatMessage> history,
      List<Asset> assets,
      List<Hub> hubs,
      List<EquipmentCardDto> matchedCards)
      throws Exception {
    List<String> modelsToTry = new ArrayList<>();
    if (StringUtils.isNotBlank(geminiModel)) {
      modelsToTry.add(geminiModel.trim());
    }
    if (!modelsToTry.contains("gemini-2.5-flash-lite")) {
      modelsToTry.add("gemini-2.5-flash-lite");
    }
    if (!modelsToTry.contains("gemini-flash-lite-latest")) {
      modelsToTry.add("gemini-flash-lite-latest");
    }
    if (!modelsToTry.contains("gemini-2.5-flash")) {
      modelsToTry.add("gemini-2.5-flash");
    }
    if (!modelsToTry.contains("gemini-flash-latest")) {
      modelsToTry.add("gemini-flash-latest");
    }
    if (!modelsToTry.contains("gemini-2.5-pro")) {
      modelsToTry.add("gemini-2.5-pro");
    }

    String systemInstruction = buildSystemPrompt(assets, hubs);

    for (String modelName : modelsToTry) {
      try {
        String endpoint =
            "https://generativelanguage.googleapis.com/v1beta/models/"
                + modelName
                + ":generateContent?key="
                + apiKey;

        ObjectNode root = objectMapper.createObjectNode();

        // System Instruction
        ObjectNode systemInstructionNode = root.putObject("systemInstruction");
        ArrayNode systemParts = systemInstructionNode.putArray("parts");
        systemParts.addObject().put("text", systemInstruction);

        // Real-time Fleet Intelligence Tools (MCP Tools)
        root.set("tools", fleetIntelligenceTools.buildGeminiToolDeclarations());

        // Contents
        ArrayNode contents = root.putArray("contents");

        // Add history
        if (history != null && !history.isEmpty()) {
          for (IntelligenceChatMessage msg : history) {
            if (StringUtils.isNotBlank(msg.getContent())) {
              ObjectNode contentNode = contents.addObject();
              contentNode.put(
                  "role",
                  "assistant".equalsIgnoreCase(msg.getRole())
                          || "model".equalsIgnoreCase(msg.getRole())
                      ? "model"
                      : "user");
              ArrayNode parts = contentNode.putArray("parts");
              parts.addObject().put("text", msg.getContent());
            }
          }
        }

        // Add current user prompt
        ObjectNode currentContent = contents.addObject();
        currentContent.put("role", "user");
        currentContent.putArray("parts").addObject().put("text", userMessage);

        // Generation Config
        ObjectNode genConfig = root.putObject("generationConfig");
        genConfig.put("temperature", 0.3);
        genConfig.put("maxOutputTokens", 900);

        // Up to 3 tool turns
        int turn = 0;
        while (turn < 3) {
          turn++;
          String jsonPayload = objectMapper.writeValueAsString(root);

          HttpRequest httpRequest =
              HttpRequest.newBuilder()
                  .uri(URI.create(endpoint))
                  .header("Content-Type", "application/json")
                  .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                  .timeout(Duration.ofSeconds(25))
                  .build();

          HttpResponse<String> httpResponse =
              HTTP_CLIENT.send(httpRequest, HttpResponse.BodyHandlers.ofString());

          if (httpResponse.statusCode() >= 200 && httpResponse.statusCode() < 300) {
            JsonNode responseJson = objectMapper.readTree(httpResponse.body());
            JsonNode candidate = responseJson.path("candidates").path(0);
            JsonNode candidateContent = candidate.path("content");
            JsonNode partsArray = candidateContent.path("parts");

            if (partsArray.isArray() && !partsArray.isEmpty()) {
              // Check for functionCall
              JsonNode functionCallPart = null;
              for (JsonNode part : partsArray) {
                if (part.has("functionCall")) {
                  functionCallPart = part;
                  break;
                }
              }

              if (functionCallPart != null) {
                JsonNode fnCall = functionCallPart.path("functionCall");
                String toolName = fnCall.path("name").asText();
                JsonNode args = fnCall.path("args");

                log.info("[Gemini Tool Call] Executing tool '{}' with args: {}", toolName, args);
                JsonNode toolResult =
                    fleetIntelligenceTools.executeTool(toolName, args, matchedCards);

                // Append model turn
                contents.add(candidateContent);

                // Append function response turn (Google Gemini API requires role: "user" for
                // function responses)
                ObjectNode fnTurn = contents.addObject();
                fnTurn.put("role", "user");
                ArrayNode fnParts = fnTurn.putArray("parts");
                ObjectNode fnPart = fnParts.addObject();
                ObjectNode fnRespWrapper = fnPart.putObject("functionResponse");
                fnRespWrapper.put("name", toolName);
                fnRespWrapper.set("response", toolResult);

                continue;
              }

              // Extract text response
              StringBuilder textBuilder = new StringBuilder();
              for (JsonNode part : partsArray) {
                if (part.has("text")) {
                  textBuilder.append(part.path("text").asText());
                }
              }

              String finalText = textBuilder.toString().trim();
              if (StringUtils.isNotBlank(finalText)) {
                log.info("[Gemini AI] Successfully generated response with model: {}", modelName);
                return finalText;
              }
            }
            break;
          } else if (httpResponse.statusCode() == 404) {
            log.warn("[Gemini AI] Model '{}' not found (404), trying next model...", modelName);
            break;
          } else if (httpResponse.statusCode() == 429) {
            log.warn(
                "[Gemini AI] Quota/Rate limit (429) on model '{}', failing over to next model...",
                modelName);
            break;
          } else if (httpResponse.statusCode() == 503) {
            log.warn(
                "[Gemini AI] Service unavailable (503) on model '{}', backing off and retrying...",
                modelName);
            try {
              Thread.sleep(1200);
            } catch (InterruptedException ignored) {
              Thread.currentThread().interrupt();
            }
            continue;
          } else {
            log.error(
                "[Gemini AI] Google API error (status {}): {}",
                httpResponse.statusCode(),
                httpResponse.body());
            break;
          }
        }
      } catch (Exception e) {
        log.warn("[Gemini AI] Failed execution with model '{}': {}", modelName, e.getMessage());
      }
    }

    return null;
  }

  private String buildSystemPrompt(List<Asset> assets, List<Hub> hubs) {
    StringBuilder sb = new StringBuilder();
    sb.append(
        "You are the official EquipGrid AI Assistant for EquipGrid (equipgrid.com), India's premier rural and urban heavy machinery rental network operating across Uttar Pradesh (Hardoi, Sandila, Bilgram, and surrounding districts).\n\n");
    sb.append("### Core Brand Guarantees & Features:\n");
    sb.append(
        "1. **2-Hour Security Deposit Refund Guarantee**: Refundable deposits paid via UPI are automatically returned within 120 minutes of machine return inspection with zero deductions.\n");
    sb.append(
        "2. **90-Minute Zero Breakdown SLA**: If a machine faces mechanical failure, our certified mobile technician or replacement machine arrives within 90 minutes.\n");
    sb.append(
        "3. **Farm Field Delivery via GPS**: Farmers and contractors can order from home; tractor-trailers drop machines directly at field headlands or construction sites.\n");
    sb.append(
        "4. **Instant UPI QR Booking**: Instant UPI reservation locking the machine in yard.\n");
    sb.append("5. **Operational Hubs**:\n");
    for (Hub h : hubs) {
      sb.append("   - ")
          .append(h.getName())
          .append(" (")
          .append(h.getAddress())
          .append(") - Phone: ")
          .append(h.getContactPhone())
          .append(", Radius: ")
          .append(h.getOperatingRadiusKm())
          .append("km\n");
    }
    sb.append("6. **24x7 Helpline**: Helpline +91 94674 79922 and WhatsApp: +91 94674 79922.\n\n");
    sb.append("### Live Tool Calling Rules:\n");
    sb.append(
        "- You have access to real-time tools connected directly to the EquipGrid inventory database and pricing engine.\n");
    sb.append(
        "- ALWAYS invoke `searchAvailableFleet` whenever the user asks about machinery availability, machine types, or rates (e.g. weeders, reapers, augers, concrete mixers, pumps, compactors).\n");
    sb.append(
        "- ALWAYS invoke `calculateRentalQuote` whenever the user asks for multi-day rental costs, delivery fees, or deposit amounts.\n");
    sb.append(
        "- Invoke `getHubCoverage` for yard locations, phone numbers, or operational radius.\n");
    sb.append(
        "- Invoke `getServiceGuarantees` for official details on deposit refund and breakdown SLA.\n\n");
    sb.append("### Response Style:\n");
    sb.append("- Provide clear, courteous, and accurate answers in clean Markdown.\n");
    sb.append("- Support English, Hindi, and Hinglish according to user preference.\n");
    sb.append(
        "- Always highlight our 2-Hour Security Deposit Refund Guarantee and 90-Minute Breakdown SLA when discussing bookings.\n");
    sb.append(
        "- Guide user on how to book directly online on the website or via our automated WhatsApp bot.\n");
    return sb.toString();
  }

  private String generateLocalDomainReply(
      String query, List<Asset> assets, List<Hub> hubs, List<EquipmentCardDto> matched) {
    String lower = query.toLowerCase();

    List<Hub> activeHubs =
        hubs != null
            ? hubs.stream()
                .filter(h -> h.getActive() == null || Boolean.TRUE.equals(h.getActive()))
                .toList()
            : Collections.emptyList();

    // 1. Dynamic check: does the user mention or ask about specific hubs / locations?
    List<Hub> userMatchedHubs = new ArrayList<>();
    for (Hub h : activeHubs) {
      String hName = h.getName() != null ? h.getName().toLowerCase() : "";
      String hCity =
          h.getCity() != null && h.getCity().getName() != null
              ? h.getCity().getName().toLowerCase()
              : "";
      String hCode = h.getCode() != null ? h.getCode().toLowerCase() : "";

      boolean cityMatch = !hCity.isBlank() && lower.contains(hCity);
      boolean codeMatch = !hCode.isBlank() && lower.contains(hCode);
      boolean nameMatch = !hName.isBlank() && lower.contains(hName);

      boolean wordMatch = false;
      for (String part : hName.split("\\s+")) {
        if (part.length() > 3
            && !part.equalsIgnoreCase("yard")
            && !part.equalsIgnoreCase("hub")
            && !part.equalsIgnoreCase("central")
            && !part.equalsIgnoreCase("agro")
            && !part.equalsIgnoreCase("industrial")) {
          if (lower.contains(part)) {
            wordMatch = true;
            break;
          }
        }
      }

      if (cityMatch || codeMatch || nameMatch || wordMatch) {
        userMatchedHubs.add(h);
      }
    }

    boolean isAskingHubOrLocation =
        lower.contains("hub")
            || lower.contains("yard")
            || lower.contains("location")
            || lower.contains("kahan")
            || lower.contains("where")
            || lower.contains("address")
            || lower.contains("pata")
            || lower.contains("station")
            || lower.contains("depot")
            || lower.contains("centre")
            || lower.contains("center")
            || lower.contains("city")
            || lower.contains("district")
            || lower.contains("near")
            || lower.contains("nearby")
            || !userMatchedHubs.isEmpty();

    if (isAskingHubOrLocation) {
      StringBuilder sb = new StringBuilder();
      if (!userMatchedHubs.isEmpty()) {
        sb.append("### 📍 Operational Hubs Matching Your Location\n\n");
        sb.append("Here are the EquipGrid station details for your requested location:\n\n");
        for (Hub h : userMatchedHubs) {
          String cityName = h.getCity() != null ? h.getCity().getName() : "Regional";
          String stateName =
              (h.getCity() != null && h.getCity().getState() != null)
                  ? h.getCity().getState().getName()
                  : "Uttar Pradesh";
          sb.append("• **").append(h.getName()).append("** (").append(cityName).append(", ").append(stateName).append(")\n");
          sb.append("  - 🏢 **Address**: ").append(h.getAddress() != null ? h.getAddress() : "Station Yard").append("\n");
          if (h.getOperatingRadiusKm() != null) {
            sb.append("  - 🚚 **Delivery Coverage**: Within **")
                .append(h.getOperatingRadiusKm())
                .append(" km** direct farm/site delivery\n");
          }
          if (h.getContactPhone() != null && !h.getContactPhone().isBlank()) {
            sb.append("  - 📞 **Yard Contact**: `").append(h.getContactPhone()).append("`\n");
          }
          sb.append("\n");
        }

        List<Hub> otherHubs = activeHubs.stream().filter(h -> !userMatchedHubs.contains(h)).toList();
        if (!otherHubs.isEmpty()) {
          sb.append("**Other Regional Hubs in Network:**\n");
          for (Hub oh : otherHubs) {
            String cName = oh.getCity() != null ? oh.getCity().getName() : "Regional";
            sb.append("- **").append(oh.getName()).append("** (").append(cName).append(")");
            if (oh.getContactPhone() != null && !oh.getContactPhone().isBlank()) {
              sb.append(" • `").append(oh.getContactPhone()).append("`");
            }
            sb.append("\n");
          }
          sb.append("\n");
        }
      } else {
        sb.append("### 📍 EquipGrid Operational Hubs & Delivery Network\n\n");
        if (!activeHubs.isEmpty()) {
          sb.append("We operate ").append(activeHubs.size()).append(" regional equipment hub(s) with direct field delivery:\n\n");
          int i = 1;
          for (Hub h : activeHubs) {
            String cityName = h.getCity() != null ? h.getCity().getName() : "Regional";
            sb.append(i++).append(". **").append(h.getName()).append("**");
            if (!cityName.isBlank()) {
              sb.append(" (").append(cityName).append(")");
            }
            sb.append(": ").append(h.getAddress() != null ? h.getAddress() : "Station Yard");
            if (h.getOperatingRadiusKm() != null) {
              sb.append(" (Serving ").append(h.getOperatingRadiusKm()).append(" km radius)");
            }
            if (h.getContactPhone() != null && !h.getContactPhone().isBlank()) {
              sb.append(" • Phone: `").append(h.getContactPhone()).append("`");
            }
            sb.append("\n");
          }
        } else {
          sb.append("EquipGrid operates regional equipment hubs with direct field delivery across Uttar Pradesh.\n");
        }
      }
      sb.append("\n🚚 **Doorstep & Field Delivery**: We drop machinery right at your farm GPS headland or construction plot via our tractor-trailer fleet.");
      return sb.toString();
    }

    if (lower.contains("refund") || lower.contains("deposit") || lower.contains("security")) {
      String contactPhone =
          !activeHubs.isEmpty() && activeHubs.get(0).getContactPhone() != null
              ? activeHubs.get(0).getContactPhone()
              : "+91 94674 79922";
      return "### 💰 2-Hour Security Deposit Refund Guarantee\n\n"
          + "At EquipGrid, your security deposit is **100% safe and hassle-free**:\n\n"
          + "- **Instant UPI Return**: As soon as your rental period ends, our yard technician completes a rapid 2-minute visual check.\n"
          + "- **120-Minute Direct Credit**: The full deposit amount is credited back directly to your original UPI ID or bank account within **2 hours (120 minutes)**.\n"
          + "- **Zero Hidden Deductions**: Transparent billing with no paperwork hassles.\n\n"
          + "Need assistance with an existing deposit? Our billing desk is on standby at **"
          + contactPhone
          + "**.";
    }

    if (lower.contains("breakdown")
        || lower.contains("repair")
        || lower.contains("stopped")
        || lower.contains("sla")
        || lower.contains("service")
        || lower.contains("kharab")) {
      String contactPhone =
          !activeHubs.isEmpty() && activeHubs.get(0).getContactPhone() != null
              ? activeHubs.get(0).getContactPhone()
              : "+91 94674 79922";
      return "### 🚨 90-Minute Zero-Breakdown Guarantee\n\n"
          + "We understand that field downtime means lost harvest windows or construction delays:\n\n"
          + "- **Rapid Mobile Response**: In the rare event of mechanical failure, call **"
          + contactPhone
          + "**.\n"
          + "- **90-Min Resolution SLA**: A certified field technician or a fresh replacement machine will arrive on site within **90 minutes** from our nearest operational hub.\n"
          + "- **Downtime Credit**: Lost operational hours are automatically credited back to your rental invoice.";
    }

    if (lower.contains("book")
        || lower.contains("rent")
        || lower.contains("price")
        || lower.contains("cost")
        || !matched.isEmpty()) {
      StringBuilder sb = new StringBuilder();
      sb.append("### 🚜 Available Machinery & Rental Details\n\n");
      if (!matched.isEmpty()) {
        sb.append("Here is the equipment matching your request from our verified fleet:\n\n");
        for (EquipmentCardDto c : matched) {
          sb.append("- **").append(c.getName()).append("**");
          if (c.getHindiName() != null && !c.getHindiName().isBlank()) {
            sb.append(" (").append(c.getHindiName()).append(")");
          }
          sb.append("\n");
          if (c.getDailyRate() != null && c.getDailyRate().compareTo(BigDecimal.ZERO) > 0) {
            sb.append("  - **Daily Rent**: ₹").append(c.getDailyRate()).append(" / day\n");
          } else {
            sb.append("  - **Daily Rent**: Rate configured in Rental Tariff Master\n");
          }
          if (c.getDepositAmount() != null) {
            sb.append("  - **Security Deposit**: ₹")
                .append(c.getDepositAmount())
                .append(" *(Refunded in 2 hours)*\n");
          }
          sb.append("  - **Hub**: ")
              .append(c.getHubName() != null ? c.getHubName() : "Operational Yard");
          if (c.getStatus() != null) {
            sb.append(" • Status: **").append(c.getStatus()).append("**");
          }
          sb.append("\n");
        }
        sb.append("\n👉 You can click **Book Machine Now** below to reserve instantly with dynamic UPI QR code!");
      } else {
        sb.append("We offer a complete fleet of verified agricultural and construction machinery:\n\n");
        List<String> agri =
            assets.stream()
                .filter(a -> a.getCategory() == AssetCategory.AGRICULTURE)
                .map(Asset::getName)
                .distinct()
                .limit(4)
                .toList();
        List<String> civil =
            assets.stream()
                .filter(a -> a.getCategory() == AssetCategory.CONSTRUCTION)
                .map(Asset::getName)
                .distinct()
                .limit(4)
                .toList();
        List<String> multi =
            assets.stream()
                .filter(a -> a.getCategory() == AssetCategory.MULTIPURPOSE_FLEET)
                .map(Asset::getName)
                .distinct()
                .limit(4)
                .toList();

        if (!agri.isEmpty()) {
          sb.append("- **🌾 Agricultural Fleet**: ").append(String.join(", ", agri)).append("\n");
        }
        if (!civil.isEmpty()) {
          sb.append("- **🏗️ Construction Fleet**: ").append(String.join(", ", civil)).append("\n");
        }
        if (!multi.isEmpty()) {
          sb.append("- **🚚 Multipurpose Fleet**: ").append(String.join(", ", multi)).append("\n");
        }
        sb.append("\nAll rentals include **doorstep farm/site delivery** and a **2-Hour Deposit Refund Guarantee**.");
      }
      return sb.toString();
    }

    if (lower.contains("delivery")
        || lower.contains("transport")
        || lower.contains("doorstep")
        || lower.contains("gps")
        || lower.contains("field")
        || lower.contains("khet")
        || lower.contains("pahuch")) {
      StringBuilder sb = new StringBuilder();
      sb.append("### 🚚 Farm Field GPS & Site Delivery\n\n");
      sb.append("EquipGrid delivers machinery directly to your farm gate, field headland, or construction site:\n\n");
      sb.append("- **GPS Pinpoint Delivery**: Share your location via WhatsApp or web booking, and our transport trailer brings the equipment directly.\n");

      if (!activeHubs.isEmpty()) {
        String hubNames = activeHubs.stream().map(Hub::getName).collect(Collectors.joining(", "));
        double minRadius =
            activeHubs.stream()
                .mapToDouble(h -> h.getOperatingRadiusKm() != null ? h.getOperatingRadiusKm().doubleValue() : 25.0)
                .min()
                .orElse(20.0);
        double maxRadius =
            activeHubs.stream()
                .mapToDouble(h -> h.getOperatingRadiusKm() != null ? h.getOperatingRadiusKm().doubleValue() : 25.0)
                .max()
                .orElse(30.0);
        sb.append("- **Operating Coverage**: ")
            .append((int) minRadius)
            .append("–")
            .append((int) maxRadius)
            .append(" km delivery radius around ")
            .append(hubNames)
            .append(".\n");
      } else {
        sb.append("- **Operating Coverage**: Direct field delivery from our nearest regional hub.\n");
      }
      sb.append("- **Transparent Logistics**: Base delivery is calculated with zero surprise charges.\n\n");
      sb.append("Ready to book delivery? Tell us your nearest village, town, or GPS pin!");
      return sb.toString();
    }

    if (lower.contains("contact")
        || lower.contains("phone")
        || lower.contains("call")
        || lower.contains("help")
        || lower.contains("support")
        || lower.contains("whatsapp")
        || lower.contains("number")) {
      String contactNumber =
          !activeHubs.isEmpty() && activeHubs.get(0).getContactPhone() != null
              ? activeHubs.get(0).getContactPhone()
              : "+91 94674 79922";
      String primaryHubAddress =
          !activeHubs.isEmpty() && activeHubs.get(0).getAddress() != null
              ? activeHubs.get(0).getAddress()
              : "Regional Operations Yard";

      return "### 📞 Contact EquipGrid 24/7 Operations Desk\n\n"
          + "We are here round the clock to support farmers and construction teams:\n\n"
          + "- **24/7 Helpline**: 📞 `" + contactNumber + "`\n"
          + "- **Instant WhatsApp Bot**: 💬 `" + contactNumber + "`\n"
          + "- **Central Operations Desk**: " + primaryHubAddress + "\n\n"
          + "You can also search or book machinery directly through this chat window!";
    }

    if (lower.contains("hello")
        || lower.contains("hi")
        || lower.contains("namaste")
        || lower.contains("hey")
        || lower.contains("pranam")) {
      StringBuilder sb = new StringBuilder();
      sb.append("### Namaste! Welcome to EquipGrid 🙏\n\n");
      sb.append("I am your EquipBot Assistant. Here is what I can do for you:\n\n");
      sb.append("1. **🚜 Browse & Book Machinery**: Agriculture, Construction & Multipurpose equipment.\n");
      sb.append("2. **💰 Check Rental Rates**: Transparent tariffs, refundable deposits, and our **2-Hour UPI Refund Guarantee**.\n");
      if (!activeHubs.isEmpty()) {
        String hubCities = activeHubs.stream()
            .map(h -> h.getCity() != null ? h.getCity().getName() : h.getName())
            .distinct()
            .collect(Collectors.joining(", "));
        sb.append("3. **🚚 Field Delivery**: Direct machine drop-off across ").append(hubCities).append(".\n");
      } else {
        sb.append("3. **🚚 Field Delivery**: Instant machine drop-off to your farm GPS location.\n");
      }
      sb.append("4. **🚨 90-Min Zero-Breakdown SLA**: On-site technician support or immediate replacement.\n\n");
      sb.append("Which equipment, location, or project do you need assistance with today?");
      return sb.toString();
    }

    // Default dynamic summary
    StringBuilder sb = new StringBuilder();
    sb.append("### EquipGrid AI Assistant 🙏\n\n");
    sb.append("I can help you check machinery availability, verify delivery to your field GPS, and reserve equipment.\n\n");
    if (!activeHubs.isEmpty()) {
      String hubCities = activeHubs.stream()
          .map(h -> h.getCity() != null ? h.getCity().getName() : h.getName())
          .distinct()
          .collect(Collectors.joining(", "));
      sb.append("- **📍 Operational Network**: Active yards serving **").append(hubCities).append("**\n");
    }
    sb.append("- **🌾 Agriculture & 🏗️ Construction & 🚚 Multipurpose**: Complete verified fleet\n");
    sb.append("- **⚡ Guarantees**: 2-Hour Deposit Refund & 90-Min Breakdown SLA\n\n");
    sb.append("Ask me about any machine name, your nearest hub location, or rental details!");
    return sb.toString();
  }

  private List<EquipmentCardDto> matchEquipmentToQuery(String query, List<Asset> assets) {
    String lower = query.toLowerCase();
    List<Asset> matches = new ArrayList<>();

    for (Asset a : assets) {
      String name = a.getName().toLowerCase();
      String tag = a.getAssetTag().toLowerCase();

      boolean match = false;
      if (lower.contains("weeder") && (name.contains("weeder") || tag.contains("wed")))
        match = true;
      else if ((lower.contains("reaper")
              || lower.contains("harvest")
              || lower.contains("crop")
              || lower.contains("paddy")
              || lower.contains("wheat"))
          && (name.contains("reaper") || tag.contains("rep"))) match = true;
      else if ((lower.contains("auger")
              || lower.contains("hole")
              || lower.contains("digger")
              || lower.contains("gaddha"))
          && (name.contains("auger") || tag.contains("aug"))) match = true;
      else if ((lower.contains("mixer")
              || lower.contains("concrete mixer")
              || lower.contains("cement"))
          && (name.contains("mixer") || tag.contains("mix"))) match = true;
      else if ((lower.contains("vibrator") || lower.contains("needle"))
          && (name.contains("vibrator") || tag.contains("vib"))) match = true;
      else if ((lower.contains("compactor") || lower.contains("roller") || lower.contains("plate"))
          && (name.contains("compactor") || tag.contains("cmp"))) match = true;
      else if ((lower.contains("hammer")
              || lower.contains("jackhammer")
              || lower.contains("demolition")
              || lower.contains("breaker"))
          && (name.contains("jackhammer") || tag.contains("jck"))) match = true;
      else if ((lower.contains("pump")
              || lower.contains("dewater")
              || lower.contains("water")
              || lower.contains("trash"))
          && (name.contains("pump") || tag.contains("pmp"))) match = true;
      else if ((lower.contains("generator") || lower.contains("power") || lower.contains("genset"))
          && (name.contains("generator") || tag.contains("gen"))) match = true;
      else if (lower.contains("agri") && a.getCategory() == AssetCategory.AGRICULTURE) match = true;
      else if (lower.contains("construction") && a.getCategory() == AssetCategory.CONSTRUCTION)
        match = true;

      if (match && !matches.contains(a)) {
        matches.add(a);
      }
    }

    return matches.stream().limit(3).map(this::mapToCardDto).collect(Collectors.toList());
  }

  private EquipmentCardDto mapToCardDto(Asset asset) {
    String hindiName =
        asset.getType() != null && asset.getType().getHindiName() != null
            ? asset.getType().getHindiName()
            : null;
    return EquipmentCardDto.builder()
        .id(asset.getId())
        .assetTag(asset.getAssetTag())
        .name(asset.getName())
        .hindiName(hindiName)
        .category(asset.getCategory().name())
        .dailyRate(asset.getDailyRate())
        .depositAmount(asset.getDepositAmount())
        .status(asset.getStatus().name())
        .hubName(asset.getHub() != null ? asset.getHub().getName() : null)
        .cityName(
            asset.getHub() != null && asset.getHub().getCity() != null
                ? asset.getHub().getCity().getName()
                : null)
        .imageUrl(asset.getImageUrl())
        .bookingUrl("/booking?equipmentId=" + asset.getId())
        .keyFeatures(
            List.of("Zero-Downtime Guarantee", "2-Hour Deposit Refund", "Doorstep Farm Delivery"))
        .build();
  }

  private List<String> buildDynamicSuggestions(String query, List<EquipmentCardDto> matched) {
    List<String> list = new ArrayList<>();
    if (matched.isEmpty()) {
      list.add("🌾 7HP Power Weeder for Sugarcane");
      list.add("🏗️ 10/7 Concrete Mixer for Slab Casting");
      list.add("💰 How does 2-Hour Deposit Refund work?");
      list.add("🚨 90-Min Breakdown SLA Guarantee");
    } else {
      list.add("📅 Check rental availability for next week");
      list.add("🚚 Direct Farm Field delivery charges");
      list.add("💰 Deposit refund timeline");
      list.add("⚡ Emergency 90-Min support");
    }
    return list;
  }

  private String determinePrimaryAction(List<EquipmentCardDto> matched) {
    if (!matched.isEmpty()) {
      return "/booking?equipmentId=" + matched.get(0).getId();
    }
    return "/booking";
  }

  private List<Asset> fetchAllAvailableAssets() {
    try {
      List<Asset> assets = assetQueryRepository.fetchAssets(null, AssetStatus.AVAILABLE);
      if (assets != null && !assets.isEmpty()) {
        return assets;
      }
    } catch (Exception e) {
      log.warn("Could not fetch assets from DB: {}", e.getMessage());
    }
    return Collections.emptyList();
  }
}
