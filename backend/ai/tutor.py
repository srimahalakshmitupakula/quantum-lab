import json
import urllib.request


OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
MODEL = "llama3.2:3b"


def ask_tutor(
    question: str,
    qubits: int,
    gates: list,
    counts: dict,
    probabilities: dict,
    statevector: list,
) -> str:

    gate_names = [gate.gate for gate in gates]

    prompt = f"""You are QuantumLab, a beginner-friendly quantum computing tutor.

Student question: {question}

Circuit:
{qubits} qubits
Gates: {gate_names}

Measurement results:
{counts}

Answer the question directly in 2 to 4 short sentences.
Use the circuit results when relevant.
Do not invent results.
For general questions, explain the concept simply.
"""

    try:
        data = json.dumps({
            "model": MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.2,
                "num_predict": 100
            }
        }).encode("utf-8")

        request = urllib.request.Request(
            OLLAMA_URL,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        with urllib.request.urlopen(request, timeout=60) as response:
            result = json.loads(response.read().decode("utf-8"))

        answer = result.get("response", "").strip()

        if answer:
            return answer

        return "I could not generate an answer. Please try again."

    except Exception as e:
        print("Ollama Tutor error:", e)
        return "The AI Tutor is temporarily unavailable. Please try again."

