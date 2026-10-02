package com.equipgrid.common.exception;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class EquipGridException extends RuntimeException {

    private final String code;
    private final String message;
    private final EquipGridExceptionEnum exceptionEnum;

    public EquipGridException(String code, String message) {
        super(message);
        this.code = code;
        this.message = message;
        this.exceptionEnum = null;
    }

    public EquipGridException(String message) {
        super(message);
        this.code = EquipGridExceptionEnum.SGO_500.name();
        this.message = message;
        this.exceptionEnum = EquipGridExceptionEnum.SGO_500;
    }

    public EquipGridException(EquipGridExceptionEnum exceptionEnum) {
        super(exceptionEnum.getMessage());
        this.code = exceptionEnum.name();
        this.message = exceptionEnum.getMessage();
        this.exceptionEnum = exceptionEnum;
    }

    public EquipGridException(EquipGridExceptionEnum exceptionEnum, Object... args) {
        super(String.format(exceptionEnum.getMessage(), args));
        this.code = exceptionEnum.name();
        this.message = String.format(exceptionEnum.getMessage(), args);
        this.exceptionEnum = exceptionEnum;
    }
}
