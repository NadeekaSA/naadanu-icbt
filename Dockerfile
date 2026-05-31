FROM python:3.12-slim

WORKDIR /app

# Force Python to flush stdout/stderr immediately (required for Railway logs)
ENV PYTHONUNBUFFERED=1

# Copy only what the notification service needs
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY notification_service.py .
COPY private_key.pem .

CMD ["python", "-u", "notification_service.py"]
