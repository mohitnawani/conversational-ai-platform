from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid

db = SQLAlchemy()

def gen_uuid():
    return str(uuid.uuid4())

class Conversation(db.Model):
    __tablename__ = "conversations"
    id = db.Column(db.String, primary_key=True, default=gen_uuid)
    title = db.Column(db.String(255), default="New Conversation")
    memory_type = db.Column(db.String(20), default="buffer")  # buffer | summary | entity | kg | hybrid
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    messages = db.relationship("Message", backref="conversation", cascade="all, delete-orphan", order_by="Message.created_at")
    summaries = db.relationship("ConversationSummary", backref="conversation", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "memory_type": self.memory_type,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "message_count": len(self.messages),
        }


class Message(db.Model):
    __tablename__ = "messages"
    id = db.Column(db.String, primary_key=True, default=gen_uuid)
    conversation_id = db.Column(db.String, db.ForeignKey("conversations.id"), nullable=False)
    role = db.Column(db.String(20), nullable=False)   # "user" | "assistant" | "system"
    content = db.Column(db.Text, nullable=False)
    token_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "role": self.role,
            "content": self.content,
            "token_count": self.token_count,
            "created_at": self.created_at.isoformat(),
        }


class ConversationSummary(db.Model):
    __tablename__ = "conversation_summaries"
    id = db.Column(db.String, primary_key=True, default=gen_uuid)
    conversation_id = db.Column(db.String, db.ForeignKey("conversations.id"), nullable=False)
    summary_text = db.Column(db.Text, nullable=False)
    messages_covered_until = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Entity(db.Model):
    __tablename__ = "entities"
    id = db.Column(db.String, primary_key=True, default=gen_uuid)
    conversation_id = db.Column(db.String, db.ForeignKey("conversations.id"), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    entity_type = db.Column(db.String(50))
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class KGTriple(db.Model):
    __tablename__ = "kg_triples"
    id = db.Column(db.String, primary_key=True, default=gen_uuid)
    conversation_id = db.Column(db.String, db.ForeignKey("conversations.id"), nullable=False)
    subject = db.Column(db.String(255), nullable=False)
    predicate = db.Column(db.String(255), nullable=False)
    object = db.Column(db.String(255), nullable=False)
    source_message_id = db.Column(db.String, db.ForeignKey("messages.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)