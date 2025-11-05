# Hyper-V Discovery PowerShell Commands Reference
# This file contains the exact PowerShell commands used by the Hyper-V discovery worker

# ============================================================================
# 1. VIRTUAL MACHINES DISCOVERY
# ============================================================================

Get-VM | ForEach-Object {
  $vm = $_
  $vmNetworkAdapters = Get-VMNetworkAdapter -VM $vm
  $vmHardDisks = Get-VMHardDiskDrive -VM $vm

  [PSCustomObject]@{
    Id = $vm.VMId
    Name = $vm.Name
    State = $vm.State
    CPUCount = $vm.ProcessorCount
    MemoryMB = $vm.MemoryAssigned / 1MB
    MemoryStartupMB = $vm.MemoryStartup / 1MB
    DynamicMemoryEnabled = $vm.DynamicMemoryEnabled
    Version = $vm.Version
    Generation = $vm.Generation
    UptimeSeconds = $vm.Uptime.TotalSeconds
    Path = $vm.Path
    Notes = $vm.Notes

    NetworkAdapters = @($vmNetworkAdapters | ForEach-Object {
      [PSCustomObject]@{
        Name = $_.Name
        SwitchName = $_.SwitchName
        MacAddress = $_.MacAddress
        IPAddresses = @($_.IPAddresses)
        Connected = $_.Connected
        Status = $_.Status
      }
    })

    VirtualHardDisks = @($vmHardDisks | ForEach-Object {
      [PSCustomObject]@{
        Path = $_.Path
        ControllerType = $_.ControllerType
        ControllerNumber = $_.ControllerNumber
        ControllerLocation = $_.ControllerLocation
      }
    })

    IntegrationServicesVersion = $vm.IntegrationServicesVersion
    IntegrationServicesState = $vm.IntegrationServicesState
    Heartbeat = $vm.Heartbeat
    ReplicationState = $vm.ReplicationState
    ReplicationMode = $vm.ReplicationMode
  }
} | ConvertTo-Json -Depth 5

# ============================================================================
# 2. HYPER-V HOSTS DISCOVERY
# ============================================================================

$vmHost = Get-VMHost
$computerSystem = Get-CimInstance -ClassName Win32_ComputerSystem
$operatingSystem = Get-CimInstance -ClassName Win32_OperatingSystem
$processor = Get-CimInstance -ClassName Win32_Processor | Select-Object -First 1
$vmSwitches = Get-VMSwitch
$storagePools = Get-StoragePool -ErrorAction SilentlyContinue

[PSCustomObject]@{
  Name = $computerSystem.Name
  HostName = $vmHost.ComputerName
  FullyQualifiedDomainName = $vmHost.FullyQualifiedDomainName

  # Virtualization Info
  VirtualizationFirmwareEnabled = $vmHost.VirtualizationFirmwareEnabled
  EnableEnhancedSessionMode = $vmHost.EnableEnhancedSessionMode

  # Version Info
  HyperVVersion = $operatingSystem.Version
  OSName = $operatingSystem.Caption
  OSArchitecture = $operatingSystem.OSArchitecture
  BuildNumber = $operatingSystem.BuildNumber

  # Hardware
  LogicalProcessorCount = $vmHost.LogicalProcessorCount
  CPUName = $processor.Name
  CPUCores = $processor.NumberOfCores
  CPULogicalProcessors = $processor.NumberOfLogicalProcessors
  MemoryCapacityGB = [Math]::Round($vmHost.MemoryCapacity / 1GB, 2)
  TotalPhysicalMemoryGB = [Math]::Round($computerSystem.TotalPhysicalMemory / 1GB, 2)

  # Storage
  VirtualHardDiskPath = $vmHost.VirtualHardDiskPath
  VirtualMachinePath = $vmHost.VirtualMachinePath

  # Switches
  VirtualSwitches = @($vmSwitches | ForEach-Object {
    [PSCustomObject]@{
      Name = $_.Name
      SwitchType = $_.SwitchType
      AllowManagementOS = $_.AllowManagementOS
    }
  })

  # Storage Pools
  StoragePools = @($storagePools | ForEach-Object {
    [PSCustomObject]@{
      FriendlyName = $_.FriendlyName
      SizeGB = [Math]::Round($_.Size / 1GB, 2)
      AllocatedSizeGB = [Math]::Round($_.AllocatedSize / 1GB, 2)
    }
  })

  # Cluster Info (if applicable)
  ClusterMembership = if (Get-Command Get-ClusterNode -ErrorAction SilentlyContinue) {
    $clusterNode = Get-ClusterNode -ErrorAction SilentlyContinue
    if ($clusterNode) {
      [PSCustomObject]@{
        NodeName = $clusterNode.Name
        State = $clusterNode.State
        ClusterName = (Get-Cluster).Name
      }
    } else { $null }
  } else { $null }
} | ConvertTo-Json -Depth 5

# ============================================================================
# 3. VIRTUAL SWITCHES DISCOVERY
# ============================================================================

Get-VMSwitch | ForEach-Object {
  $switch = $_
  $switchExtensions = Get-VMSwitchExtension -VMSwitch $switch
  $connectedAdapters = Get-VMNetworkAdapter -All | Where-Object { $_.SwitchName -eq $switch.Name }

  [PSCustomObject]@{
    Id = $switch.Id
    Name = $switch.Name
    SwitchType = $switch.SwitchType
    AllowManagementOS = $switch.AllowManagementOS
    EmbeddedTeamingEnabled = $switch.EmbeddedTeamingEnabled
    IovEnabled = $switch.IovEnabled
    PacketDirectEnabled = $switch.PacketDirectEnabled
    BandwidthReservationMode = $switch.BandwidthReservationMode

    # Network Adapter (for External switches)
    NetAdapterInterfaceDescription = $switch.NetAdapterInterfaceDescription
    NetAdapterInterfaceGuid = $switch.NetAdapterInterfaceGuid

    # Extensions
    Extensions = @($switchExtensions | ForEach-Object {
      [PSCustomObject]@{
        Name = $_.Name
        ExtensionType = $_.ExtensionType
        Enabled = $_.Enabled
      }
    })

    # Connected Adapters
    ConnectedAdapters = @($connectedAdapters | ForEach-Object {
      [PSCustomObject]@{
        VMName = $_.VMName
        AdapterName = $_.Name
        MacAddress = $_.MacAddress
        IsManagementOS = $_.IsManagementOS
      }
    })
  }
} | ConvertTo-Json -Depth 5

# ============================================================================
# 4. VHD FILES DISCOVERY
# ============================================================================

# Get all VHDs from all VMs
$vhdPaths = Get-VM | Get-VMHardDiskDrive | Select-Object -ExpandProperty Path -Unique

$vhdPaths | ForEach-Object {
  $vhdPath = $_
  $vhdInfo = Get-VHD -Path $vhdPath

  # Find VMs using this VHD
  $attachedVMs = Get-VM | Where-Object {
    ($_ | Get-VMHardDiskDrive).Path -contains $vhdPath
  } | Select-Object -ExpandProperty Name

  [PSCustomObject]@{
    Path = $vhdInfo.Path
    VhdFormat = $vhdInfo.VhdFormat
    VhdType = $vhdInfo.VhdType
    FileSize = $vhdInfo.FileSize
    Size = $vhdInfo.Size
    MinimumSize = $vhdInfo.MinimumSize
    LogicalSectorSize = $vhdInfo.LogicalSectorSize
    PhysicalSectorSize = $vhdInfo.PhysicalSectorSize
    BlockSize = $vhdInfo.BlockSize
    ParentPath = $vhdInfo.ParentPath
    DiskIdentifier = $vhdInfo.DiskIdentifier
    FragmentationPercentage = $vhdInfo.FragmentationPercentage
    Alignment = $vhdInfo.Alignment
    Attached = $vhdInfo.Attached
    DiskNumber = $vhdInfo.DiskNumber
    AttachedVMs = @($attachedVMs)
  }
} | ConvertTo-Json -Depth 5

# ============================================================================
# ADDITIONAL COMMANDS (For Future Enhancements)
# ============================================================================

# VM Snapshots
Get-VM | Get-VMSnapshot | Select-Object Name, VMName, SnapshotType, CreationTime, ParentSnapshotName

# VM Checkpoints
Get-VM | Get-VMCheckpoint | Select-Object Name, VMName, CheckpointType, CreationTime

# Replication Status
Get-VM | Get-VMReplication | Select-Object VMName, State, Mode, PrimaryServer, ReplicaServer

# Integration Services
Get-VM | Select-Object Name, IntegrationServicesState, IntegrationServicesVersion

# VM Network Adapter Advanced Properties
Get-VM | Get-VMNetworkAdapter | Get-VMNetworkAdapterVlan

# Storage QoS
Get-VM | Get-VMHardDiskDrive | Get-StorageQoSFlow

# Resource Metering
Get-VM | Enable-VMResourceMetering
Get-VM | Measure-VM

# ============================================================================
# TROUBLESHOOTING COMMANDS
# ============================================================================

# Test WinRM connectivity
Test-WSMan -ComputerName "hyperv-host.example.com"

# List all VMs with detailed info
Get-VM | Format-List *

# Check Hyper-V service status
Get-Service vmms

# Verify Hyper-V role installed
Get-WindowsFeature -Name Hyper-V

# Check cluster status (if clustered)
Get-Cluster
Get-ClusterNode
Get-ClusterResource

# View recent Hyper-V events
Get-WinEvent -LogName "Microsoft-Windows-Hyper-V-*" -MaxEvents 100
