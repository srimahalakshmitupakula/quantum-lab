"""
Pydantic models describing the shape of requests and responses for
POST /api/simulate.

These models only check *structure* (right fields, right types).
Deeper checks that need circuit context (e.g. "is qubit 5 valid for
a 2-qubit circuit?") happen in quantum/circuit_builder.py.
"""

from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator

# Gates supported in this MVP. Add new gate names here as you extend it.
SUPPORTED_GATES = ("H", "X", "Y", "Z", "S", "T", "CNOT", "MEASURE")

GateName = Literal["H", "X", "Y", "Z", "S", "T", "CNOT", "MEASURE"]
class GateSpec(BaseModel):
    """
    A single gate placed on the circuit.

    Single-qubit gates (H, X, Y, Z) use `qubit`.
    CNOT uses `control` and `target` instead of `qubit`.

    NOTE: the current Phase 1 frontend circuit format only sends
    {"gate": ..., "qubit": ..., "position": ...} and has no way to
    express control/target yet. This model is written for the
    *correct* CNOT shape going forward; the frontend will need a
    small update later to actually populate control/target when the
    user places a CNOT gate.
    """

    gate: GateName
    position: int = Field(..., ge=0, description="Column/order of the gate on the circuit")

    # Used by single-qubit gates: H, X, Y, Z
    qubit: Optional[int] = Field(None, ge=0)

    # Used only by CNOT
    control: Optional[int] = Field(None, ge=0)
    target: Optional[int] = Field(None, ge=0)

    @model_validator(mode="after")
    def check_gate_fields_match(self) -> "GateSpec":
        if self.gate == "CNOT":
            if self.control is None or self.target is None:
                raise ValueError("CNOT requires both 'control' and 'target' qubit indices")
            if self.qubit is not None:
                raise ValueError("CNOT should use 'control'/'target', not 'qubit'")
        else:
            if self.qubit is None:
                raise ValueError(f"Gate '{self.gate}' requires a 'qubit' index")
            if self.control is not None or self.target is not None:
                raise ValueError(f"Gate '{self.gate}' should not have 'control'/'target'")
        return self


class CircuitRequest(BaseModel):
    """The full circuit sent from the frontend."""

    qubits: int = Field(..., ge=1, le=20, description="Number of qubits in the circuit")
    gates: list[GateSpec] = Field(default_factory=list)
    shots: int = Field(1024, ge=1, le=100_000, description="Number of times to run the circuit")


class SimulationResponse(BaseModel):
    """What we send back to the frontend after a successful simulation."""

    counts: dict[str, int] = Field(..., description="Measurement outcome -> number of shots")
    shots: int
    num_qubits: int
    execution_time_ms: float
    statevector: list[dict[str, float]]


class ErrorResponse(BaseModel):
    """Shape of an error returned to the frontend."""

    error: str
    detail: str


class TutorRequest(BaseModel):
    """Question and quantum context sent to the AI tutor."""

    question: str = Field(..., min_length=1)
    qubits: int = Field(..., ge=1, le=20)
    gates: list[GateSpec] = Field(default_factory=list)

    counts: dict[str, int] = Field(default_factory=dict)
    probabilities: dict[str, float] = Field(default_factory=dict)
    statevector: list[dict[str, float]] = Field(default_factory=list)


class TutorResponse(BaseModel):
    """Explanation returned by the AI tutor."""

    answer: str