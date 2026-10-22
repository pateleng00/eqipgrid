package com.equipgrid.intelligence.service;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.enums.AssetCategory;
import java.util.List;

public interface IAssetVectorEmbeddingService {

  /**
   * Builds the comprehensive denormalized semantic document string for an asset, combining its tag,
   * name, Hindi name, type, manufacturer, model, specifications, hub, city, rates, and
   * multi-lingual keywords.
   */
  String buildAssetEmbeddingText(Asset asset);

  /**
   * Generates a 768-dimensional float embedding using Gemini's embedding model.
   *
   * @param text input text to embed
   * @return float array of 768 dimensions, or null if API unavailable
   */
  float[] generateEmbedding(String text);

  /**
   * Batch updates vector embeddings for all assets in the database.
   *
   * @return total number of assets successfully updated
   */
  int syncAllAssetEmbeddings();

  /**
   * Updates vector embedding for a single asset by ID.
   *
   * @param assetId ID of the asset to update
   * @return true if updated successfully
   */
  boolean updateAssetEmbedding(Long assetId);

  /**
   * Performs semantic vector search on assets table using pgvector cosine distance.
   *
   * @param query natural language user search query
   * @param category optional category filter
   * @param hubId optional hub filter
   * @param limit max results
   * @return list of matching Assets ordered by highest cosine similarity
   */
  List<Asset> searchAssetsByVector(String query, AssetCategory category, Long hubId, int limit);
}
