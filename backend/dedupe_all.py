from app import create_app
from models.database import db, Conversation
from services.kg_memory import dedupe_triples
from services.entity_memory import dedupe_entities

app = create_app()
with app.app_context():
    for c in Conversation.query.all():
        print(
            c.id,
            "entities removed:",
            dedupe_entities(c.id),
            "| triples removed:",
            dedupe_triples(c.id),
        )
