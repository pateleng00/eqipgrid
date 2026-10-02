package com.equipgrid.common;

import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.common.dto.rest.MessageApiResponse;
import com.equipgrid.common.exception.EquipGridException;
import com.equipgrid.common.exception.EquipGridExceptionEnum;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(EquipGridException.class)
    public ResponseEntity<ApiResponse<Object>> handleEquipGridException(EquipGridException ex) {
        HttpStatus status = HttpStatus.BAD_REQUEST;

        if (ex.getCode() != null) {
            if (ex.getCode().contains("404")) {
                status = HttpStatus.NOT_FOUND;
            } else if (ex.getCode().contains("401")) {
                status = HttpStatus.UNAUTHORIZED;
            } else if (ex.getCode().contains("403")) {
                status = HttpStatus.FORBIDDEN;
            } else if (ex.getCode().contains("500")) {
                status = HttpStatus.INTERNAL_SERVER_ERROR;
            }
        }

        return ResponseEntity.status(status).body(ApiResponse.buildFail(ex, null));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            errors.put(error.getField(), error.getDefaultMessage());
        }

        MessageApiResponse message = new MessageApiResponse(
                EquipGridExceptionEnum.SGO_400.name(),
                EquipGridExceptionEnum.SGO_400.getMessage()
        );

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.buildFail(message.getCode(), message.getText(), errors));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleGeneric(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.buildFail(
                        EquipGridExceptionEnum.SGO_500.name(),
                        ex.getMessage() != null ? ex.getMessage() : EquipGridExceptionEnum.SGO_500.getMessage()
                ));
    }
}
