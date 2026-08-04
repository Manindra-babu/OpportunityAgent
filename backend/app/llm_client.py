import logging
import json
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from groq import Groq
from app.models import UserCredential
from app.security.crypto import decrypt_credential

logger = logging.getLogger(__name__)

class GroqLLMClient:
    def get_groq_client_for_user(self, db: Session, user_id: Optional[int]) -> Optional[Groq]:
        if not user_id:
            return None
        
        cred = db.query(UserCredential).filter(UserCredential.user_id == user_id).first()
        if not cred or not cred.groq_api_key_encrypted or not cred.groq_connected:
            return None

        raw_key = decrypt_credential(cred.groq_api_key_encrypted)
        if not raw_key:
            return None

        try:
            return Groq(api_key=raw_key)
        except Exception as e:
            logger.error(f"Failed to instantiate Groq client for user {user_id}: {e}")
            return None

    def complete_json_for_user(
        self,
        db: Session,
        user_id: Optional[int],
        system_prompt: str,
        user_prompt: str,
        model: str = "llama-3.3-70b-versatile",
        fallback_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Sends completion request using the specific user's decrypted BYOK Groq API key.
        """
        client = self.get_groq_client_for_user(db, user_id)
        if not client:
            logger.info(f"User {user_id} has no connected Groq API key. Returning structured fallback.")
            if fallback_data is not None:
                return fallback_data
            return {
                "error": "No connected Groq API key found. Please add your Groq API key on your Profile page.",
                "groq_key_required": True
            }

        json_system_prompt = (
            system_prompt
            + "\n\nCRITICAL: You MUST respond ONLY with a valid, raw JSON object. Do not include markdown codeblocks (```json), explanation, or commentary outside the JSON."
        )

        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": json_system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.2,
                response_format={"type": "json_object"}
            )
            raw_text = response.choices[0].message.content.strip()

            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            raw_text = raw_text.strip()

            return json.loads(raw_text)
        except Exception as e:
            logger.error(f"Groq LLM call failed for user {user_id}: {e}")
            if fallback_data is not None:
                return fallback_data
            return {"error": str(e), "fallback": True}

llm_client = GroqLLMClient()
