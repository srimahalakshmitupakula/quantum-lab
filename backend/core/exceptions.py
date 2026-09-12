"""
Custom exceptions for circuit validation.

Pydantic already catches structural problems (wrong types, missing
fields) automatically. These exceptions cover *semantic* problems
that Pydantic can't know about by itself, e.g. "qubit index 5 does
not exist on a 2-qubit circuit". They are raised inside quantum/
and turned into clean HTTP 400 responses inside api/routes.py.
"""


class CircuitValidationError(Exception):
    """Base class for all circuit validation errors."""


class InvalidQubitIndexError(CircuitValidationError):
    """Raised when a gate references a qubit index that does not exist."""


class UnsupportedGateError(CircuitValidationError):
    """Raised when a gate name is not one of the supported gates."""


class InvalidCNOTError(CircuitValidationError):
    """Raised when a CNOT gate has an invalid control/target configuration."""
