package com.equipgrid.common.dto.rest;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MessageApiResponse {
    private String code;
    private String text;

    public MessageApiResponse(String text) {
        this.code = "SUCCESS";
        this.text = text;
    }
}
