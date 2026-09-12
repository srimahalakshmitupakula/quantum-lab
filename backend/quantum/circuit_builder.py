"""
Turns a validated CircuitRequest into a real qiskit.QuantumCircuit.

This file is pure Qiskit logic with no FastAPI/HTTP imports at all,
which means you can import and test it directly in a plain Python
shell or a unit test, with nothing to do with the web server.
"""

from qiskit import QuantumCircuit

from core.exceptions import InvalidCNOTError, InvalidQubitIndexError, UnsupportedGateError
from models.schemas import CircuitRequest, GateSpec, SUPPORTED_GATES


def _check_qubit_index(index: int, num_qubits: int, context: str) -> None:
    if index < 0 or index >= num_qubits:
        raise InvalidQubitIndexError(
            f"{context}: qubit index {index} is out of range for a "
            f"{num_qubits}-qubit circuit (valid range 0-{num_qubits - 1})"
        )


def _apply_gate(qc: QuantumCircuit, gate: GateSpec, num_qubits: int) -> None:
    if gate.gate not in SUPPORTED_GATES:
        # Pydantic's Literal type already blocks this in practice, but we
        # keep this check so circuit_builder is safe to call on its own.
        raise UnsupportedGateError(f"Gate '{gate.gate}' is not supported")

    if gate.gate == "CNOT":
        _check_qubit_index(gate.control, num_qubits, "CNOT control")
        _check_qubit_index(gate.target, num_qubits, "CNOT target")
        if gate.control == gate.target:
            raise InvalidCNOTError(
                f"CNOT control and target must be different qubits (both were {gate.control})"
            )
        qc.cx(gate.control, gate.target)
        return

    # Single-qubit gates: H, X, Y, Z
    _check_qubit_index(gate.qubit, num_qubits, f"Gate '{gate.gate}'")
    if gate.gate == "H":
        qc.h(gate.qubit)
    elif gate.gate == "X":
        qc.x(gate.qubit)
    elif gate.gate == "Y":
        qc.y(gate.qubit)
    elif gate.gate == "Z":
        qc.z(gate.qubit)


def build_circuit(request: CircuitRequest) -> QuantumCircuit:
    """
    Build a QuantumCircuit from a validated CircuitRequest.

    - Classical bits equal to qubit count, so we can measure everything.
    - Gates are applied in `position` order (frontend column order),
      not the order they happen to appear in the JSON list.
    - Measurement of all qubits is added at the end.
    """
    num_qubits = request.qubits
    qc = QuantumCircuit(num_qubits, num_qubits)

    ordered_gates = sorted(request.gates, key=lambda g: g.position)
    for gate in ordered_gates:
        _apply_gate(qc, gate, num_qubits)

    qc.measure(range(num_qubits), range(num_qubits))
    return qc
