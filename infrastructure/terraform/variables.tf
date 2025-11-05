variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

# VPC Variables
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "private_subnets" {
  description = "Private subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnets" {
  description = "Public subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "database_subnets" {
  description = "Database subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]
}

# RDS Variables
variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r6g.xlarge"
}

variable "rds_allocated_storage" {
  description = "Initial allocated storage in GB"
  type        = number
  default     = 200
}

variable "rds_max_allocated_storage" {
  description = "Maximum allocated storage for autoscaling"
  type        = number
  default     = 1000
}

variable "rds_multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = true
}

variable "rds_backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 30
}

# ElastiCache Variables
variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.r6g.large"
}

variable "redis_num_nodes" {
  description = "Number of cache clusters in replication group"
  type        = number
  default     = 6
}

variable "redis_automatic_failover" {
  description = "Enable automatic failover"
  type        = bool
  default     = true
}

# MSK Variables
variable "kafka_instance_type" {
  description = "MSK broker instance type"
  type        = string
  default     = "kafka.m5.xlarge"
}

variable "kafka_number_of_brokers" {
  description = "Number of Kafka brokers"
  type        = number
  default     = 3
}

variable "kafka_version" {
  description = "Kafka version"
  type        = string
  default     = "3.5.1"
}

variable "kafka_ebs_volume_size" {
  description = "EBS volume size per broker in GB"
  type        = number
  default     = 100
}

# Neo4j Variables
variable "neo4j_instance_type" {
  description = "Neo4j EC2 instance type"
  type        = string
  default     = "r6i.2xlarge"
}

# S3 Variables
variable "backup_retention_days" {
  description = "Backup retention in days"
  type        = number
  default     = 90
}
