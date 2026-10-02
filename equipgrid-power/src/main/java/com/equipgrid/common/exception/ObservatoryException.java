package com.equipgrid.common.exception;

public class ObservatoryException extends EquipGridException {

    public ObservatoryException(String code, String message) {
        super(code, message);
    }

    public ObservatoryException(String message) {
        super(message);
    }

    public ObservatoryException(EquipGridExceptionEnum exceptionEnum) {
        super(exceptionEnum);
    }

    public ObservatoryException(EquipGridExceptionEnum exceptionEnum, Object... args) {
        super(exceptionEnum, args);
    }
}
