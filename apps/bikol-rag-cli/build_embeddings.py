import json
import os
import numpy as np
from sentence_transformers import SentenceTransformer
import hashlib
import config

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    chunks_path = config.CHUNKS_PATH
    
    if not os.path.exists(chunks_path):
        print(f"Error: {chunks_path} not found.")
        return

    with open(chunks_path, "r", encoding="utf-8") as f:
        chunks = json.load(f)

    print(f"Loaded {len(chunks)} chunks. Loading SentenceTransformer model...")
    model = SentenceTransformer(config.EMBEDDING_MODEL_NAME)
    
    # Retrieval uses English descriptions for reviewed examples. The Bikol
    # response remains available separately as a few-shot demonstration.
    texts = [c["retrieval_text"] for c in chunks]
    
    print("Computing embeddings...")
    embeddings = model.encode(texts, normalize_embeddings=True)
    
    out_path = config.EMBEDDINGS_PATH
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    np.save(out_path, embeddings)
    with open(chunks_path, "rb") as f:
        corpus_hash = hashlib.sha256(f.read()).hexdigest()
    with open(config.EMBEDDINGS_META_PATH, "w", encoding="utf-8") as f:
        json.dump({"corpus_sha256": corpus_hash, "model": config.EMBEDDING_MODEL_NAME,
                   "rows": len(chunks)}, f, indent=2)
    
    print(f"Saved embeddings shape {embeddings.shape} to {out_path}")

if __name__ == "__main__":
    main()
