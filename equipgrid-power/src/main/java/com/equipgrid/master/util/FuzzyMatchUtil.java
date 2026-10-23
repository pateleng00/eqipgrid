package com.equipgrid.master.util;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class FuzzyMatchUtil {

  /**
   * Checks if a candidate string matches any existing name above a threshold (default 0.80 / 80%).
   */
  public static FuzzyResult findFuzzyMatch(
      String candidate, List<MatchCandidate> existingList, Long excludeId, double threshold) {
    if (candidate == null
        || candidate.isBlank()
        || existingList == null
        || existingList.isEmpty()) {
      return FuzzyResult.notDuplicate();
    }

    String candClean = cleanString(candidate);
    if (candClean.isBlank()) {
      return FuzzyResult.notDuplicate();
    }

    double highestScore = 0.0;
    String bestMatch = null;

    for (MatchCandidate existing : existingList) {
      if (existing == null || (excludeId != null && excludeId.equals(existing.id()))) {
        continue;
      }
      if (existing.name() == null || existing.name().isBlank()) {
        continue;
      }

      double score = computeSimilarity(candClean, cleanString(existing.name()));
      if (score > highestScore) {
        highestScore = score;
        bestMatch = existing.name();
      }
    }

    if (highestScore >= threshold && bestMatch != null) {
      return FuzzyResult.duplicate(bestMatch, highestScore);
    }

    return FuzzyResult.notDuplicate();
  }

  public static double computeSimilarity(String s1, String s2) {
    if (s1 == null || s2 == null) return 0.0;
    if (s1.equalsIgnoreCase(s2)) return 1.0;

    String strip1 = s1.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
    String strip2 = s2.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
    if (!strip1.isEmpty() && strip1.equals(strip2)) {
      return 1.0;
    }

    double levSim = levenshteinSimilarity(strip1, strip2);
    double diceSim = diceSimilarity(strip1, strip2);
    double tokenSim = tokenJaccardSimilarity(s1.toLowerCase(), s2.toLowerCase());

    return Math.max(levSim, Math.max(diceSim, tokenSim));
  }

  private static String cleanString(String s) {
    if (s == null) return "";
    return s.trim()
        .replaceAll("\\s+", " ")
        .replaceAll("(?i)\\b(ltd|limited|pvt|private|inc|corp|co)\\b", "")
        .trim();
  }

  private static double levenshteinSimilarity(String s1, String s2) {
    if (s1.isEmpty() && s2.isEmpty()) return 1.0;
    if (s1.isEmpty() || s2.isEmpty()) return 0.0;

    int dist = computeLevenshteinDistance(s1, s2);
    int maxLen = Math.max(s1.length(), s2.length());
    return 1.0 - ((double) dist / maxLen);
  }

  private static int computeLevenshteinDistance(String a, String b) {
    int[] costs = new int[b.length() + 1];
    for (int j = 0; j < costs.length; j++) {
      costs[j] = j;
    }
    for (int i = 1; i <= a.length(); i++) {
      costs[0] = i;
      int nw = i - 1;
      for (int j = 1; j <= b.length(); j++) {
        int cj =
            Math.min(
                1 + Math.min(costs[j], costs[j - 1]),
                a.charAt(i - 1) == b.charAt(j - 1) ? nw : nw + 1);
        nw = costs[j];
        costs[j] = cj;
      }
    }
    return costs[b.length()];
  }

  private static double diceSimilarity(String s1, String s2) {
    if (s1.length() < 2 || s2.length() < 2) {
      return s1.equalsIgnoreCase(s2) ? 1.0 : 0.0;
    }

    Set<String> bigrams1 = new HashSet<>();
    for (int i = 0; i < s1.length() - 1; i++) {
      bigrams1.add(s1.substring(i, i + 2));
    }

    Set<String> bigrams2 = new HashSet<>();
    for (int i = 0; i < s2.length() - 1; i++) {
      bigrams2.add(s2.substring(i, i + 2));
    }

    Set<String> intersection = new HashSet<>(bigrams1);
    intersection.retainAll(bigrams2);

    return (2.0 * intersection.size()) / (bigrams1.size() + bigrams2.size());
  }

  private static double tokenJaccardSimilarity(String s1, String s2) {
    Set<String> tokens1 = new HashSet<>(Arrays.asList(s1.split("[\\s_\\-]+")));
    Set<String> tokens2 = new HashSet<>(Arrays.asList(s2.split("[\\s_\\-]+")));

    tokens1.removeIf(String::isBlank);
    tokens2.removeIf(String::isBlank);

    if (tokens1.isEmpty() && tokens2.isEmpty()) return 1.0;
    if (tokens1.isEmpty() || tokens2.isEmpty()) return 0.0;

    Set<String> intersection = new HashSet<>(tokens1);
    intersection.retainAll(tokens2);

    // If one set of tokens contains the other entirely (e.g. "John Deere" inside "John Deere
    // Tractors")
    if (tokens1.size() > 1
        && tokens2.size() > 1
        && (tokens1.containsAll(tokens2) || tokens2.containsAll(tokens1))) {
      return 0.88;
    }

    Set<String> union = new HashSet<>(tokens1);
    union.addAll(tokens2);

    return (double) intersection.size() / union.size();
  }

  public record MatchCandidate(Long id, String name) {}

  public record FuzzyResult(
      boolean duplicate, String matchedName, double similarityPercentage, String message) {
    public static FuzzyResult notDuplicate() {
      return new FuzzyResult(false, null, 0.0, "Name is available");
    }

    public static FuzzyResult duplicate(String matchedName, double score) {
      int pct = (int) Math.round(score * 100);
      return new FuzzyResult(
          true,
          matchedName,
          pct,
          String.format(
              "Similar record '%s' already exists (%d%% match). Please verify to avoid duplicates.",
              matchedName, pct));
    }
  }
}
