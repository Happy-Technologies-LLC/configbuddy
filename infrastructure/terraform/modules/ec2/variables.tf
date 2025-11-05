variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for instances"
  type        = list(string)
}

variable "allowed_security_groups" {
  description = "Security groups allowed to access instances"
  type        = list(string)
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
}

variable "instance_count" {
  description = "Number of instances"
  type        = number
}

variable "name_prefix" {
  description = "Name prefix for resources"
  type        = string
}

variable "user_data_template" {
  description = "User data script template"
  type        = string
  default     = ""
}
