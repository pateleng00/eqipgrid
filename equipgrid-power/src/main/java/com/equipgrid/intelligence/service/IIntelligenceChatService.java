package com.equipgrid.intelligence.service;

import com.equipgrid.intelligence.dto.request.IntelligenceChatRequest;
import com.equipgrid.intelligence.dto.response.IntelligenceChatResponse;

public interface IIntelligenceChatService {
    IntelligenceChatResponse chat(IntelligenceChatRequest request);
}
