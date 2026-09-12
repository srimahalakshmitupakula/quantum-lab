"""
HTTP routes. This is the ONLY file in the backend that knows about
FastAPI/HTTP. It orchestrates the flow but does not contain any
quantum logic itself:

    request JSON
      -> validated automatically into CircuitRequest by FastAPI/Pydantic
      -> circuit_builder.build_circuit()   (semantic validation + Qiskit circuit)
      -> simulator.run_simulation()        (Aer execution)
      -> SimulationResponse JSON
"""

from fastapi import APIRouter, HTTPException

from core.exceptions import CircuitValidationError
from models.schemas import CircuitRequest, SimulationResponse, TutorRequest, TutorResponse
from quantum.circuit_builder import build_circuit
from quantum.simulator import run_simulation
from ai.tutor import ask_tutor

router = APIRouter()


@router.post("/api/simulate", response_model=SimulationResponse)
def simulate_circuit(request: CircuitRequest) -> SimulationResponse:
    try:
        circuit = build_circuit(request)
    except CircuitValidationError as exc:
        # Semantic errors we raised ourselves (bad qubit index, bad CNOT, etc.)
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    result = run_simulation(circuit, shots=request.shots)

    return SimulationResponse(
    counts=result.counts,
    shots=result.shots,
    num_qubits=result.num_qubits,
    execution_time_ms=result.execution_time_ms,
    statevector=result.statevector,
)

@router.post("/api/tutor", response_model=TutorResponse)
def tutor(request: TutorRequest) -> TutorResponse:
    """
    Send the student's question and actual quantum results
    to the AI tutor.
    """

    answer = ask_tutor(
        question=request.question,
        qubits=request.qubits,
        gates=request.gates,
        counts=request.counts,
        probabilities=request.probabilities,
        statevector=request.statevector,
    )

    return TutorResponse(answer=answer)
