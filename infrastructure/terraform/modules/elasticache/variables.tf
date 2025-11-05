variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for Redis cluster"
  type        = list(string)
}

variable "allowed_security_groups" {
  description = "Security groups allowed to access Redis"
  type        = list(string)
}

variable "node_type" {
  description = "ElastiCache node type"
  type        = string
}

variable "num_cache_clusters" {
  description = "Number of cache clusters"
  type        = number
}

variable "automatic_failover" {
  description = "Enable automatic failover"
  type        = bool
}
