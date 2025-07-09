import json
import urllib3
import os
from datetime import datetime

def handler(event, context):
    """
    Lambda function to send SNS notifications to Slack
    """
    
    # Get environment variables
    webhook_url = os.environ.get('SLACK_WEBHOOK_URL')
    environment = os.environ.get('ENVIRONMENT', 'unknown')
    
    if not webhook_url:
        print("SLACK_WEBHOOK_URL not configured")
        return {
            'statusCode': 400,
            'body': json.dumps('SLACK_WEBHOOK_URL not configured')
        }
    
    # Parse SNS message
    try:
        sns_message = json.loads(event['Records'][0]['Sns']['Message'])
        subject = event['Records'][0]['Sns']['Subject']
        timestamp = event['Records'][0]['Sns']['Timestamp']
    except (KeyError, json.JSONDecodeError) as e:
        print(f"Error parsing SNS message: {e}")
        return {
            'statusCode': 400,
            'body': json.dumps(f'Error parsing SNS message: {e}')
        }
    
    # Determine alert severity based on subject
    if 'CRITICAL' in subject:
        color = '#FF0000'  # Red
        emoji = '🚨'
    elif 'WARNING' in subject:
        color = '#FFA500'  # Orange
        emoji = '⚠️'
    else:
        color = '#0000FF'  # Blue
        emoji = 'ℹ️'
    
    # Parse CloudWatch alarm if available
    alert_name = sns_message.get('AlarmName', 'Unknown Alert')
    alert_description = sns_message.get('AlarmDescription', 'No description available')
    new_state = sns_message.get('NewStateValue', 'Unknown')
    old_state = sns_message.get('OldStateValue', 'Unknown')
    reason = sns_message.get('NewStateReason', 'No reason provided')
    
    # Create Slack message
    slack_message = {
        "username": "OpenSCENARIO Monitor",
        "icon_emoji": ":warning:",
        "attachments": [
            {
                "color": color,
                "title": f"{emoji} {alert_name}",
                "fields": [
                    {
                        "title": "Environment",
                        "value": environment.upper(),
                        "short": True
                    },
                    {
                        "title": "Status",
                        "value": f"{old_state} → {new_state}",
                        "short": True
                    },
                    {
                        "title": "Description",
                        "value": alert_description,
                        "short": False
                    },
                    {
                        "title": "Reason",
                        "value": reason,
                        "short": False
                    },
                    {
                        "title": "Timestamp",
                        "value": timestamp,
                        "short": True
                    }
                ],
                "footer": "OpenSCENARIO Monitoring",
                "ts": int(datetime.now().timestamp())
            }
        ]
    }
    
    # Send to Slack
    http = urllib3.PoolManager()
    
    try:
        response = http.request(
            'POST',
            webhook_url,
            body=json.dumps(slack_message),
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status == 200:
            print(f"Successfully sent alert to Slack: {alert_name}")
            return {
                'statusCode': 200,
                'body': json.dumps('Alert sent to Slack successfully')
            }
        else:
            print(f"Failed to send alert to Slack: {response.status}")
            return {
                'statusCode': response.status,
                'body': json.dumps(f'Failed to send alert to Slack: {response.status}')
            }
            
    except Exception as e:
        print(f"Error sending to Slack: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error sending to Slack: {e}')
        }