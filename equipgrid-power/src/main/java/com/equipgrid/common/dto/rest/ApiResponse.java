package com.equipgrid.common.dto.rest;

import com.equipgrid.common.dto.page.PageDetails;
import com.equipgrid.common.exception.EquipGridException;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import lombok.RequiredArgsConstructor;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
@RequiredArgsConstructor
public class ApiResponse<T> {

    private boolean success;
    private MessageApiResponse message;
    private String requestId;
    private T data;
    private PageDetails pageDetails;

    public ApiResponse(boolean success, MessageApiResponse message, T data, PageDetails pageDetails) {
        this.success = success;
        this.message = message;
        this.data = data;
        this.pageDetails = pageDetails;
    }

    private ApiResponse(boolean success, MessageApiResponse message) {
        this.success = success;
        this.message = message;
    }

    private ApiResponse(boolean success) {
        this.success = success;
    }

    private ApiResponse(boolean success, T data, PageDetails pageDetails) {
        this.success = success;
        this.data = data;
        this.pageDetails = pageDetails;
    }

    private ApiResponse(boolean success, T data) {
        this.success = success;
        this.data = data;
    }

    private ApiResponse(boolean success, MessageApiResponse message, T data) {
        this.success = success;
        this.message = message;
        this.data = data;
    }

    public static <T> ApiResponse<T> buildSuccess(T data) {
        return new ApiResponse<>(Boolean.TRUE, data);
    }

    public static <T> ApiResponse<T> buildSuccess(String code, String text, T object) {
        MessageApiResponse message = new MessageApiResponse(code, text);
        return new ApiResponse<>(Boolean.TRUE, message, object, null);
    }

    public static <T> ApiResponse<T> buildSuccess(String text, T object) {
        MessageApiResponse message = new MessageApiResponse("EG-200", text);
        return new ApiResponse<>(Boolean.TRUE, message, object, null);
    }

    public static ApiResponse<Object> buildSuccess(String text) {
        MessageApiResponse message = new MessageApiResponse("EG-200", text);
        return new ApiResponse<>(Boolean.TRUE, message, null, null);
    }

    public static ApiResponse<Object> buildSuccess() {
        return new ApiResponse<>(Boolean.TRUE);
    }

    public static <T> ApiResponse<T> buildSuccess(T data, PageDetails pageDetails) {
        return new ApiResponse<>(Boolean.TRUE, data, pageDetails);
    }

    public static ApiResponse<Object> buildFail(MessageApiResponse message) {
        return new ApiResponse<>(Boolean.FALSE, message);
    }

    public static ApiResponse<Object> buildFail(String code, String text) {
        MessageApiResponse message = new MessageApiResponse(code, text);
        return new ApiResponse<>(Boolean.FALSE, message);
    }

    public static <T> ApiResponse<T> buildFail(String code, String text, T object) {
        MessageApiResponse message = new MessageApiResponse(code, text);
        return new ApiResponse<>(Boolean.FALSE, message, object, null);
    }

    public static ApiResponse<Object> buildFail() {
        return new ApiResponse<>(Boolean.FALSE);
    }

    public static <T> ApiResponse<T> buildFail(T data) {
        return new ApiResponse<>(Boolean.FALSE, data);
    }

    public static <T> ApiResponse<T> buildFail(EquipGridException exception, T data) {
        MessageApiResponse message = new MessageApiResponse(exception.getCode(), exception.getMessage());
        return new ApiResponse<>(Boolean.FALSE, message, data);
    }

    public static <T> ApiResponse<T> ok(T data) {
        return buildSuccess(data);
    }

    public static <T> ApiResponse<T> ok(String text, T data) {
        return buildSuccess("SG-200", text, data);
    }

    public static ApiResponse<Object> error(String message) {
        return buildFail("SGO_500", message);
    }
}
