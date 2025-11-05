# Hyper-V Discovery Worker - Implementation Notes

## Overview

The Hyper-V discovery worker provides agentless discovery of Microsoft Hyper-V virtualization environments via PowerShell remoting (WinRM). It discovers virtual machines, hosts, virtual switches, and VHD files.

## Implementation Status

**Status**: ✅ Complete (PowerShell execution pending)

**Completed**:
- ✅ Full worker implementation following VMware vSphere pattern
- ✅ 4 resource types discovery methods
- ✅ Relationship inference logic
- ✅ Comprehensive unit tests (15+ test cases)
- ✅ Type definitions updated (DiscoveryProvider, UnifiedCredential)
- ✅ Error handling with retry logic
- ✅ Environment inference from VM notes
- ✅ WinRM protocol support in UnifiedCredential

**Pending**:
- ⏳ PowerShell/WinRM execution library integration
- ⏳ Integration tests with real Hyper-V environment

## Resources Discovered

### 1. Virtual Machines (CI Type: `virtual-machine`)
- **PowerShell**: `Get-VM`, `Get-VMNetworkAdapter`, `Get-VMHardDiskDrive`
- **Key Attributes**:
  - VM ID, Name, State (Running/Off/Paused/Saved)
  - CPU count, Memory (assigned/startup), Dynamic Memory
  - Version, Generation, Uptime
  - Network adapters with IP addresses and MAC
  - Virtual hard disks with controller info
  - Integration Services version and state
  - Replication state and mode
- **Filtering**: Power state filter (default: Running only)

### 2. Hosts (CI Type: `server`)
- **PowerShell**: `Get-VMHost`, `Get-CimInstance`, `Get-VMSwitch`, `Get-StoragePool`, `Get-ClusterNode`
- **Key Attributes**:
  - Host name, FQDN, Hyper-V version
  - OS name, architecture, build number
  - CPU (logical processors, cores, model)
  - Memory capacity, physical memory
  - Virtual switches (name, type, management OS)
  - Storage pools (size, allocated)
  - Cluster membership (if clustered)

### 3. Virtual Switches (CI Type: `network-device`)
- **PowerShell**: `Get-VMSwitch`, `Get-VMSwitchExtension`, `Get-VMNetworkAdapter`
- **Key Attributes**:
  - Switch ID, Name, Type (Internal/External/Private)
  - Allow Management OS, Embedded Teaming
  - IOV/PacketDirect enabled
  - Physical adapter (for External switches)
  - Extensions (name, type, enabled)
  - Connected adapters and VMs

### 4. VHD Files (CI Type: `storage`)
- **PowerShell**: `Get-VHD`, `Get-VMHardDiskDrive`
- **Key Attributes**:
  - Path, Format (VHD/VHDX), Type (Fixed/Dynamic/Differencing)
  - File size, virtual size, minimum size
  - Sector sizes, block size
  - Parent path (for differencing disks)
  - Disk identifier, fragmentation
  - Attached VMs

## Relationships Inferred

1. **VM → Host** (`DEPLOYED_ON`)
   - All VMs deployed on their Hyper-V host
   - Confidence: 1.0

2. **VM → VirtualSwitch** (`CONNECTS_TO`)
   - VMs connected to virtual switches via network adapters
   - Includes: adapter name, MAC, IPs, connection status
   - Confidence: 1.0

3. **VM → VHD** (`USES`)
   - VMs using VHD files for storage
   - Includes: controller type, number, location
   - Confidence: 1.0

4. **VHD → Host** (`HOSTED_ON`)
   - VHD files stored on Hyper-V host
   - Includes: path, VHD type
   - Confidence: 1.0

## Configuration

### Credential Requirements

**Protocol**: `winrm`
**Scope**: `ssh` or `virtualization`

```json
{
  "protocol": "winrm",
  "credentials": {
    "username": "DOMAIN\\Administrator",
    "password": "SecurePassword123!",
    "port": 5985,
    "transport": "http"
  }
}
```

**Ports**:
- HTTP: 5985 (default)
- HTTPS: 5986

**Transport**:
- `http`: Unencrypted (default, suitable for internal networks)
- `https`: Encrypted (recommended for production)

### Resource Configuration

```typescript
{
  virtual_machines: {
    power_state_filter: ['Running', 'Off', 'Paused', 'Saved'],
    include_snapshots: false
  },
  hosts: {},
  virtual_switches: {},
  vhd_files: {}
}
```

## PowerShell Commands Used

### Virtual Machines
```powershell
Get-VM | ForEach-Object {
  $vm = $_
  $vmNetworkAdapters = Get-VMNetworkAdapter -VM $vm
  $vmHardDisks = Get-VMHardDiskDrive -VM $vm
  # ... extract details
} | ConvertTo-Json -Depth 5
```

### Hosts
```powershell
$vmHost = Get-VMHost
$computerSystem = Get-CimInstance -ClassName Win32_ComputerSystem
$operatingSystem = Get-CimInstance -ClassName Win32_OperatingSystem
# ... extract details
| ConvertTo-Json -Depth 5
```

### Virtual Switches
```powershell
Get-VMSwitch | ForEach-Object {
  $switch = $_
  $switchExtensions = Get-VMSwitchExtension -VMSwitch $switch
  $connectedAdapters = Get-VMNetworkAdapter -All | Where-Object { $_.SwitchName -eq $switch.Name }
  # ... extract details
} | ConvertTo-Json -Depth 5
```

### VHD Files
```powershell
$vhdPaths = Get-VM | Get-VMHardDiskDrive | Select-Object -ExpandProperty Path -Unique
$vhdPaths | ForEach-Object {
  $vhdInfo = Get-VHD -Path $_
  # ... extract details
} | ConvertTo-Json -Depth 5
```

## PowerShell/WinRM Integration

### Required Package

**⚠️ TODO**: Install PowerShell execution package

**Options**:
1. **node-powershell** (recommended)
   ```bash
   npm install node-powershell
   ```

2. **@vestas/node-powershell-session** (remote execution)
   ```bash
   npm install @vestas/node-powershell-session
   ```

3. **edge-ps** (alternative)
   ```bash
   npm install edge-ps
   ```

### Implementation Pattern

```typescript
// Using node-powershell with remote session
import PowerShell from 'node-powershell';
import Session from '@vestas/node-powershell-session';

private async executePowerShellCommand(command: string): Promise<PowerShellResult> {
  const session = new Session({
    host: this.host,
    port: this.port,
    username: this.username,
    password: this.password,
    transport: this.transport,
  });

  try {
    await session.connect();
    const result = await session.invoke(command);
    await session.disconnect();

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      code: result.code,
    };
  } catch (error) {
    logger.error('PowerShell command execution failed', { host: this.host, error });
    throw error;
  }
}
```

## Hyper-V Host Prerequisites

### Enable PowerShell Remoting
```powershell
# On Hyper-V host (as Administrator)
Enable-PSRemoting -Force
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "*" -Force
```

### Configure WinRM
```powershell
# HTTP (port 5985)
winrm quickconfig

# HTTPS (port 5986) - recommended
winrm quickconfig -transport:https
```

### Firewall Rules
```powershell
# Allow WinRM HTTP
New-NetFirewallRule -DisplayName "WinRM HTTP" -Direction Inbound -LocalPort 5985 -Protocol TCP -Action Allow

# Allow WinRM HTTPS
New-NetFirewallRule -DisplayName "WinRM HTTPS" -Direction Inbound -LocalPort 5986 -Protocol TCP -Action Allow
```

### Grant Permissions
```powershell
# Add user to Hyper-V Administrators group
Add-LocalGroupMember -Group "Hyper-V Administrators" -Member "DOMAIN\DiscoveryUser"
```

## Error Handling

The worker implements:
- **Retry logic**: 3 attempts with exponential backoff (2s initial delay)
- **Graceful degradation**: Individual resource failures don't stop entire discovery
- **Detailed logging**: All PowerShell commands and results logged
- **JSON parsing errors**: Handled with substring logging for debugging

## Testing

### Unit Tests
- ✅ Constructor validation (protocol, credentials)
- ✅ Relationship inference (4 types)
- ✅ Power state mapping
- ✅ Environment inference
- ✅ VHD ID generation
- ✅ Complex topology relationships

**Run tests**:
```bash
cd packages/discovery-engine
npm test -- hyperv-discovery.worker.test.ts
```

### Integration Testing (TODO)

**Test environment**:
1. Spin up Windows Server with Hyper-V
2. Create test VMs with various states
3. Configure WinRM access
4. Run discovery worker
5. Validate CIs and relationships

**Test scenarios**:
- VMs in different power states (Running, Off, Paused)
- Multiple virtual switches (Internal, External, Private)
- VHD types (Fixed, Dynamic, Differencing)
- Clustered Hyper-V (if available)

## Usage Example

```typescript
import { HyperVDiscoveryWorker } from './workers/hyperv-discovery.worker';
import { UnifiedCredential } from '@cmdb/common';

// Create credential
const credential: UnifiedCredential = {
  protocol: 'winrm',
  scope: 'virtualization',
  credentials: {
    username: 'DOMAIN\\Administrator',
    password: 'SecurePassword123!',
    port: 5985,
    transport: 'http',
  },
  // ... other fields
};

// Initialize worker
const worker = new HyperVDiscoveryWorker('hyperv-host.example.com', credential);

// Discover all resources
const allCIs = await worker.discoverAll('job-123', {}, {
  virtual_machines: {
    power_state_filter: ['Running', 'Off'],
    include_snapshots: false,
  },
});

// Infer relationships
const relationships = worker.inferRelationships(allCIs);

console.log(`Discovered ${allCIs.length} CIs and ${relationships.length} relationships`);
```

## Security Considerations

1. **Use HTTPS transport** for production (port 5986)
2. **Encrypt credentials** in storage (handled by UnifiedCredential system)
3. **Least privilege**: Use service account with minimal Hyper-V permissions
4. **Network isolation**: Run discovery from secure management network
5. **Audit logging**: All PowerShell commands are logged for audit

## Known Limitations

1. **PowerShell execution not implemented** - Requires node-powershell package
2. **No snapshot discovery** - Can be added with `Get-VMSnapshot`
3. **No checkpoint discovery** - Can be added with `Get-VMCheckpoint`
4. **No replica host discovery** - Can be added for Hyper-V Replica setups

## Future Enhancements

1. **VM Snapshots**: Add snapshot discovery with `Get-VMSnapshot`
2. **Checkpoints**: Discover VM checkpoints
3. **Replica Hosts**: Support Hyper-V Replica configurations
4. **Performance Metrics**: Collect CPU/Memory usage via WMI
5. **SCVMM Integration**: Support System Center Virtual Machine Manager
6. **Batch Operations**: Optimize for large Hyper-V clusters

## References

- [Hyper-V PowerShell Cmdlets](https://docs.microsoft.com/en-us/powershell/module/hyper-v/)
- [WinRM Configuration](https://docs.microsoft.com/en-us/windows/win32/winrm/installation-and-configuration-for-windows-remote-management)
- [VMware vSphere Worker](./vmware-vsphere-discovery.worker.ts) - Reference implementation
- [UnifiedCredential Types](../../common/src/types/unified-credential.types.ts)
