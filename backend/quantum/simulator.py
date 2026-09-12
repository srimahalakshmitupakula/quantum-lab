"""
Executes a QuantumCircuit on Qiskit Aer and returns real results.
"""

import time
from dataclasses import dataclass

from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator


@dataclass
class SimulationResult:
    counts: dict[str, int]
    shots: int
    num_qubits: int
    execution_time_ms: float
    statevector: list[dict[str, float]]


def run_simulation(circuit: QuantumCircuit, shots: int) -> SimulationResult:
    """
    Run the circuit on AerSimulator and return:
    - measurement counts
    - execution time
    - statevector
    """

    simulator = AerSimulator()
    statevector_simulator = AerSimulator(method="statevector")

    start = time.perf_counter()

    # -----------------------------
    # STATEVECTOR SIMULATION
    # -----------------------------

    # Create a copy so the original circuit remains unchanged.
    statevector_circuit = circuit.copy()

    # Remove final measurement operations.
    statevector_circuit.remove_final_measurements(inplace=True)

    # Tell Aer to save the statevector.
    statevector_circuit.save_statevector()

    statevector_job = statevector_simulator.run(statevector_circuit)
    statevector_result = statevector_job.result()

    statevector = statevector_result.get_statevector(
        statevector_circuit
    )

    # Convert complex amplitudes into JSON-friendly objects.
    statevector_data = [
        {
            "real": float(amplitude.real),
            "imag": float(amplitude.imag),
        }
        for amplitude in statevector
    ]

    # -----------------------------
    # MEASUREMENT SIMULATION
    # -----------------------------

    job = simulator.run(circuit, shots=shots)
    result = job.result()

    counts = result.get_counts(circuit)

    elapsed_ms = (time.perf_counter() - start) * 1000

    # -----------------------------
    # RETURN RESULT
    # -----------------------------

    return SimulationResult(
        counts=dict(counts),
        shots=shots,
        num_qubits=circuit.num_qubits,
        execution_time_ms=elapsed_ms,
        statevector=statevector_data,
    )