variable "environment" {
  description = "Environment name"
  type        = string
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
}
