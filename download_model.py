import sys
import argparse
from huggingface_hub import snapshot_download

def download_model(model_id):
    print(f"Downloading and caching {model_id}...")
    try:
        # snapshot_download will download the entire repository to the HF cache
        # and print the tqdm progress bar to stdout
        path = snapshot_download(repo_id=model_id)
        print(f"Model successfully cached at: {path}")
    except Exception as e:
        print(f"Error downloading {model_id}: {e}")
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Download a HuggingFace model to cache.')
    parser.add_argument('--model', type=str, required=True, help='The HuggingFace model ID (e.g. suno/bark-small)')
    args = parser.parse_args()
    
    download_model(args.model)
