variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for MSK brokers"
  type        = list(string)
}

variable "allowed_security_groups" {
  description = "Security groups allowed to access MSK"
  type        = list(string)
}

variable "instance_type" {
  description = "MSK broker instance type"
  type        = string
}

variable "number_of_brokers" {
  description = "Number of Kafka brokers (must be multiple of AZs)"
  type        = number
}

variable "kafka_version" {
  description = "Kafka version"
  type        = string
}

variable "ebs_volume_size" {
  description = "EBS volume size per broker in GB"
  type        = number
}
