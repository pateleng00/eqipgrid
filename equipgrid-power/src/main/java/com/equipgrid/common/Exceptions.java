package com.equipgrid.common;

import com.equipgrid.common.exception.EquipGridException;
import com.equipgrid.common.exception.EquipGridExceptionEnum;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

public class Exceptions {

    @ResponseStatus(HttpStatus.NOT_FOUND)
    public static class ResourceNotFoundException extends EquipGridException {
        public ResourceNotFoundException(String message) {
            super(EquipGridExceptionEnum.EG_404.name(), message);
        }
    }

    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public static class BusinessRuleViolationException extends EquipGridException {
        public BusinessRuleViolationException(String message) {
            super(EquipGridExceptionEnum.EG_400.name(), message);
        }
    }

}
