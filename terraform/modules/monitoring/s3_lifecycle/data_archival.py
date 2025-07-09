import boto3
import json
import os
from datetime import datetime, timedelta
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event, context):
    """
    Lambda function to archive monitoring data to S3
    """
    
    # Get environment variables
    archive_bucket = os.environ.get('ARCHIVE_BUCKET')
    environment = os.environ.get('ENVIRONMENT', 'unknown')
    retention_days = int(os.environ.get('RETENTION_DAYS', '2555'))
    
    if not archive_bucket:
        logger.error("ARCHIVE_BUCKET environment variable not set")
        return {
            'statusCode': 400,
            'body': json.dumps('ARCHIVE_BUCKET environment variable not set')
        }
    
    # Initialize AWS clients
    logs_client = boto3.client('logs')
    s3_client = boto3.client('s3')
    cloudwatch_client = boto3.client('cloudwatch')
    
    archived_count = 0
    failed_count = 0
    
    try:
        # Archive CloudWatch Logs
        logger.info("Starting CloudWatch Logs archival")
        archived_logs, failed_logs = archive_cloudwatch_logs(logs_client, s3_client, archive_bucket, environment)
        archived_count += archived_logs
        failed_count += failed_logs
        
        # Archive CloudWatch Metrics
        logger.info("Starting CloudWatch Metrics archival")
        archived_metrics, failed_metrics = archive_cloudwatch_metrics(cloudwatch_client, s3_client, archive_bucket, environment)
        archived_count += archived_metrics
        failed_count += failed_metrics
        
        # Clean up old archived data
        logger.info("Starting cleanup of old archived data")
        cleanup_old_data(s3_client, archive_bucket, retention_days)
        
        # Create success metric
        put_custom_metric('DataArchivalSuccess', archived_count, environment)
        
        logger.info(f"Archival completed. Archived: {archived_count}, Failed: {failed_count}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Data archival completed successfully',
                'archived_count': archived_count,
                'failed_count': failed_count
            })
        }
        
    except Exception as e:
        logger.error(f"Error during data archival: {str(e)}")
        put_custom_metric('DataArchivalFailure', 1, environment)
        
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': f'Data archival failed: {str(e)}',
                'archived_count': archived_count,
                'failed_count': failed_count
            })
        }

def archive_cloudwatch_logs(logs_client, s3_client, bucket, environment):
    """
    Archive CloudWatch Logs to S3
    """
    archived_count = 0
    failed_count = 0
    
    try:
        # List log groups
        log_groups = logs_client.describe_log_groups()
        
        for log_group in log_groups['logGroups']:
            log_group_name = log_group['logGroupName']
            
            # Skip if not OpenSCENARIO related
            if 'openscenario' not in log_group_name.lower():
                continue
            
            try:
                # Get log streams
                log_streams = logs_client.describe_log_streams(
                    logGroupName=log_group_name,
                    orderBy='LastEventTime',
                    descending=True,
                    limit=50
                )
                
                for stream in log_streams['logStreams']:
                    stream_name = stream['logStreamName']
                    
                    # Check if stream is older than 7 days
                    if 'lastEventTime' in stream:
                        last_event_time = datetime.fromtimestamp(stream['lastEventTime'] / 1000)
                        if (datetime.now() - last_event_time).days < 7:
                            continue
                    
                    # Get log events
                    events = logs_client.get_log_events(
                        logGroupName=log_group_name,
                        logStreamName=stream_name,
                        startFromHead=True
                    )
                    
                    if events['events']:
                        # Create S3 key
                        date_str = datetime.now().strftime('%Y/%m/%d')
                        s3_key = f"cloudwatch-logs/{environment}/{log_group_name}/{stream_name}/{date_str}/logs.json"
                        
                        # Upload to S3
                        s3_client.put_object(
                            Bucket=bucket,
                            Key=s3_key,
                            Body=json.dumps(events['events'], indent=2),
                            ContentType='application/json',
                            StorageClass='STANDARD'
                        )
                        
                        archived_count += 1
                        logger.info(f"Archived log stream: {log_group_name}/{stream_name}")
                        
            except Exception as e:
                logger.error(f"Failed to archive log group {log_group_name}: {str(e)}")
                failed_count += 1
                
    except Exception as e:
        logger.error(f"Error listing log groups: {str(e)}")
        failed_count += 1
    
    return archived_count, failed_count

def archive_cloudwatch_metrics(cloudwatch_client, s3_client, bucket, environment):
    """
    Archive CloudWatch Metrics to S3
    """
    archived_count = 0
    failed_count = 0
    
    try:
        # Define metrics to archive
        metrics_to_archive = [
            {'Namespace': 'AWS/ECS', 'MetricName': 'CPUUtilization'},
            {'Namespace': 'AWS/ECS', 'MetricName': 'MemoryUtilization'},
            {'Namespace': 'AWS/ApplicationELB', 'MetricName': 'TargetResponseTime'},
            {'Namespace': 'AWS/ApplicationELB', 'MetricName': 'HTTPCode_Target_5XX_Count'},
            {'Namespace': 'AWS/RDS', 'MetricName': 'CPUUtilization'},
            {'Namespace': 'AWS/RDS', 'MetricName': 'DatabaseConnections'},
            {'Namespace': 'OpenSCENARIO/Application', 'MetricName': 'openai_api_failures'},
            {'Namespace': 'OpenSCENARIO/Application', 'MetricName': 'scenario_validation_failures'}
        ]
        
        # Calculate time range (last 7 days)
        end_time = datetime.now()
        start_time = end_time - timedelta(days=7)
        
        for metric in metrics_to_archive:
            try:
                # Get metric statistics
                response = cloudwatch_client.get_metric_statistics(
                    Namespace=metric['Namespace'],
                    MetricName=metric['MetricName'],
                    StartTime=start_time,
                    EndTime=end_time,
                    Period=300,  # 5 minutes
                    Statistics=['Average', 'Maximum', 'Minimum', 'Sum']
                )
                
                if response['Datapoints']:
                    # Create S3 key
                    date_str = datetime.now().strftime('%Y/%m/%d')
                    s3_key = f"prometheus-metrics/{environment}/{metric['Namespace']}/{metric['MetricName']}/{date_str}/metrics.json"
                    
                    # Upload to S3
                    s3_client.put_object(
                        Bucket=bucket,
                        Key=s3_key,
                        Body=json.dumps(response['Datapoints'], indent=2, default=str),
                        ContentType='application/json',
                        StorageClass='STANDARD'
                    )
                    
                    archived_count += 1
                    logger.info(f"Archived metric: {metric['Namespace']}/{metric['MetricName']}")
                    
            except Exception as e:
                logger.error(f"Failed to archive metric {metric['Namespace']}/{metric['MetricName']}: {str(e)}")
                failed_count += 1
                
    except Exception as e:
        logger.error(f"Error archiving metrics: {str(e)}")
        failed_count += 1
    
    return archived_count, failed_count

def cleanup_old_data(s3_client, bucket, retention_days):
    """
    Clean up old archived data based on retention policy
    """
    try:
        # Calculate cutoff date
        cutoff_date = datetime.now() - timedelta(days=retention_days)
        
        # List objects in bucket
        response = s3_client.list_objects_v2(Bucket=bucket)
        
        if 'Contents' in response:
            for obj in response['Contents']:
                # Check if object is older than retention period
                if obj['LastModified'].replace(tzinfo=None) < cutoff_date:
                    s3_client.delete_object(Bucket=bucket, Key=obj['Key'])
                    logger.info(f"Deleted old archived data: {obj['Key']}")
                    
    except Exception as e:
        logger.error(f"Error cleaning up old data: {str(e)}")

def put_custom_metric(metric_name, value, environment):
    """
    Put custom CloudWatch metric
    """
    try:
        cloudwatch_client = boto3.client('cloudwatch')
        cloudwatch_client.put_metric_data(
            Namespace='OpenSCENARIO/DataArchival',
            MetricData=[
                {
                    'MetricName': metric_name,
                    'Value': value,
                    'Unit': 'Count',
                    'Dimensions': [
                        {
                            'Name': 'Environment',
                            'Value': environment
                        }
                    ]
                }
            ]
        )
    except Exception as e:
        logger.error(f"Error putting custom metric: {str(e)}")