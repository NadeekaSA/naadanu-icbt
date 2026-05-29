FROM python:3.12-slim

WORKDIR /app

# Copy only what the notification service needs
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY notification_service.py .
COPY private_key.pem .

CMD ["python", "notification_service.py"]
