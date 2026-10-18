"""
The model behind the API.

The trained scikit-learn pipeline (character n-gram TF-IDF + SGD classifier) is loaded once, when the
server starts. Its file name, SHA-256 hash and decision threshold come from models/registry.json, so the
threshold can be changed there without touching code.

joblib files are pickles and can run code when loaded, so the file's SHA-256 is checked against the
registry BEFORE joblib.load is called. A file that does not match is refused.

References:
    https://scikit-learn.org/stable/model_persistence.html
    https://joblib.readthedocs.io/en/stable/persistence.html
    https://docs.python.org/3/library/hashlib.html
"""

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

import joblib

MODELS_DIR: Path = Path(__file__).resolve().parent.parent / "models"
REGISTRY_PATH: Path = MODELS_DIR / "registry.json"


@dataclass(frozen=True)
class Prediction:
    """One verdict from the model."""

    label: Literal["phishing", "legitimate"]
    confidence: float


def file_sha256(path: Path) -> str:
    """
    Works out the SHA-256 hash of a file, reading it in chunks.

    Args:
        path (Path): The file to hash.

    Returns:
        str: The hash as 64 hex characters.
    """
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


class PhishingModel:
    """Wraps the trained pipeline and turns its probability into a label."""

    def __init__(self, pipeline: Any, name: str, threshold: float) -> None:
        """
        Args:
            pipeline (Any): The loaded scikit-learn pipeline (takes raw URL strings).
            name (str): The model's file name, shown by /api/health.
            threshold (float): Phishing probability at or above which a URL is labelled phishing.
        """
        self.pipeline = pipeline
        self.name = name
        self.threshold = threshold

    def predict(self, url: str) -> Prediction:
        """
        Scores a URL.

        Args:
            url (str): The URL to check.

        Returns:
            Prediction: The label and the model's probability for that label.
        """
        phishing_probability = float(self.pipeline.predict_proba([url])[0][1])
        if phishing_probability >= self.threshold:
            return Prediction(label="phishing", confidence=round(phishing_probability, 4))
        return Prediction(label="legitimate", confidence=round(1 - phishing_probability, 4))


def load_model() -> PhishingModel:
    """
    Loads the model. Called once, when the server starts.

    Returns:
        PhishingModel: The model used for every request.

    Raises:
        RuntimeError: If the registry is not valid, the threshold is out of range or the file's hash does not match.
    """
    registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    model_path = MODELS_DIR / registry["file"]
    threshold = float(registry["threshold"])

    if not 0 < threshold < 1:
        raise RuntimeError(f"Threshold must be between 0 and 1, got {threshold}")

    actual_hash = file_sha256(model_path)
    if actual_hash != registry["sha256"].lower():
        raise RuntimeError(f"{model_path.name} does not match the hash in registry.json; refusing to load it")

    pipeline = joblib.load(model_path)
    return PhishingModel(pipeline=pipeline, name=model_path.name, threshold=threshold)
