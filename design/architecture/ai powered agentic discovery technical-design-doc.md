# Intelligent Discovery Platform - Technical Design Document

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [Data Models](#data-models)
5. [API Specifications](#api-specifications)
6. [Pattern System](#pattern-system)
7. [AI Agent System](#ai-agent-system)
8. [Community Registry](#community-registry)
9. [Security & Authentication](#security--authentication)
10. [Deployment Architecture](#deployment-architecture)
11. [Implementation Phases](#implementation-phases)

---

## System Overview

### Mission
Build an open-source, AI-powered infrastructure discovery platform that autonomously discovers, maps, and documents IT infrastructure using agentic AI and community-driven pattern intelligence.

### Core Principles
- **AI-First**: Use LLM agents for intelligent, adaptive discovery
- **Shift Left**: Convert AI discoveries to fast, deterministic code patterns
- **Community-Driven**: Collaborative pattern library with network effects
- **Privacy-Preserving**: Share patterns, never raw infrastructure data
- **Open Source**: Core platform freely available, premium features optional

### Technology Stack

**Backend**
- Python 3.11+ (async/await for concurrent discovery)
- FastAPI (REST API and WebSocket support)
- PostgreSQL 15+ (primary datastore with JSONB support)
- Redis 7+ (caching, job queue, real-time updates)
- Celery (distributed task processing)
- SQLAlchemy 2.0 (ORM with async support)

**AI/ML**
- LangChain / LangGraph (agent orchestration)
- OpenAI API / Anthropic Claude API (LLM backend)
- ChromaDB or Qdrant (vector storage for patterns)
- Sentence Transformers (embedding generation)

**Discovery Tools**
- NMAP Python (network scanning)
- Paramiko (SSH connections)
- pysnmp (SNMP queries)
- Requests/httpx (HTTP probing)
- WMI/PowerShell connectors (Windows)

**Frontend**
- React 18+ with TypeScript
- TanStack Query (data fetching)
- Zustand (state management)
- D3.js / Cytoscape.js (graph visualization)
- Shadcn/ui (component library)

**Infrastructure**
- Docker / Docker Compose (containerization)
- Kubernetes (optional, for scale)
- GitHub Actions (CI/CD)
- Prometheus + Grafana (monitoring)

---

## Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Web Interface                            │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐│
│  │ Discovery    │  │ Service Map  │  │ Pattern Marketplace    ││
│  │ Dashboard    │  │ Visualizer   │  │                        ││
│  └──────────────┘  └──────────────┘  └────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              ↕ REST API / WebSocket
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway (FastAPI)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐│
│  │ Discovery    │  │ Pattern      │  │ Registry               ││
│  │ API          │  │ API          │  │ API                    ││
│  └──────────────┘  └──────────────┘  └────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                      Core Discovery Engine                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Discovery Orchestrator                        │ │
│  │  ┌──────────────────┐      ┌──────────────────────────┐   │ │
│  │  │ Pattern Matcher  │      │   AI Agent Coordinator   │   │ │
│  │  │  (Fast Path)     │      │   (Intelligent Path)     │   │ │
│  │  └──────────────────┘      └──────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↕                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   AI Agent System                          │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐ │ │
│  │  │ Network  │ │Credential│ │Relation  │ │   Pattern    │ │ │
│  │  │ Scout    │ │ Manager  │ │ Mapper   │ │   Compiler   │ │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↕                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  Discovery Tools Layer                     │ │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌─────────┐ │ │
│  │  │ NMAP   │ │  SSH   │ │ SNMP   │ │  HTTP  │ │   WMI   │ │ │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └─────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                        Data Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐│
│  │ PostgreSQL   │  │ Redis        │  │ Vector DB (Chroma)     ││
│  │ (CMDB Data)  │  │ (Cache/Jobs) │  │ (Pattern Embeddings)   ││
│  └──────────────┘  └──────────────┘  └────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                   Community Pattern Registry                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Pattern Storage (S3/MinIO) + Metadata DB                  │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐ │ │
│  │  │ Pattern  │ │ Version  │ │Community │ │   AI Review  │ │ │
│  │  │ Registry │ │ Control  │ │ Validation│ │   System    │ │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### System Flow

**Standard Discovery Flow (Pattern Match)**
1. User initiates scan of network range
2. Orchestrator delegates to Pattern Matcher
3. Pattern Matcher tries codified patterns (fast path)
4. If match found (confidence > 0.9), execute pattern discovery
5. Store results in CMDB
6. Update pattern usage statistics

**AI-Powered Discovery Flow (Unknown Service)**
1. Pattern Matcher fails to identify service (confidence < 0.7)
2. Orchestrator delegates to AI Agent Coordinator
3. AI Agent analyzes initial scan data, formulates strategy
4. Multi-agent system executes discovery (Network Scout, Credential Manager, etc.)
5. AI pieces together service architecture
6. Pattern Compiler extracts learned pattern from AI trace
7. New pattern validated and stored for future use
8. Results stored in CMDB

**Pattern Learning & Distribution Flow**
1. Pattern Compiler generates code from successful AI discovery
2. Pattern tested against validation suite
3. AI reviews pattern for quality and security
4. Pattern published to local registry
5. (Optional) User publishes to community registry
6. Community validates, improves, and rates pattern
7. Pattern becomes available globally
8. Other users pull pattern for their discoveries

---

## Core Components

### 1. Discovery Orchestrator

**Purpose**: Central coordination of all discovery operations

**File**: `backend/src/core/orchestrator.py`

```python
from typing import Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum

class DiscoveryStrategy(Enum):
    FAST_PATTERN = "fast_pattern"
    AI_AGENT = "ai_agent"
    HYBRID = "hybrid"

@dataclass
class DiscoveryContext:
    target_host: str
    target_port: int
    scan_result: Dict[str, Any]
    credentials: Optional[Dict[str, Any]] = None
    tags: Dict[str, str] = None

class DiscoveryOrchestrator:
    def __init__(
        self,
        pattern_matcher: PatternMatcher,
        ai_coordinator: AIAgentCoordinator,
        pattern_compiler: PatternCompiler
    ):
        self.pattern_matcher = pattern_matcher
        self.ai_coordinator = ai_coordinator
        self.pattern_compiler = pattern_compiler
        
    async def discover(self, context: DiscoveryContext) -> DiscoveryResult:
        """
        Main discovery entry point
        """
        # Try fast pattern matching first
        pattern_result = await self.pattern_matcher.match(context)
        
        if pattern_result.confidence > 0.9:
            # High confidence - use fast path
            return await self._execute_pattern_discovery(pattern_result, context)
        
        elif pattern_result.confidence > 0.7:
            # Medium confidence - try pattern but verify with AI
            result = await self._execute_pattern_discovery(pattern_result, context)
            verification = await self.ai_coordinator.verify(result)
            
            if not verification.is_valid:
                # Pattern failed - use AI and update pattern
                return await self._ai_discovery_with_learning(context)
            
            return result
        
        else:
            # Low confidence - go straight to AI
            return await self._ai_discovery_with_learning(context)
    
    async def _ai_discovery_with_learning(
        self, 
        context: DiscoveryContext
    ) -> DiscoveryResult:
        """
        Use AI agent for discovery and extract learned pattern
        """
        # AI discovers service
        result = await self.ai_coordinator.intelligent_discover(context)
        
        # Check if AI found a repeatable pattern
        if self.ai_coordinator.found_new_pattern():
            # Compile AI trace into code pattern
            new_pattern = await self.pattern_compiler.codify(
                self.ai_coordinator.last_discovery_trace
            )
            
            # Validate and store pattern
            if await self._validate_pattern(new_pattern):
                await self.pattern_matcher.add_pattern(new_pattern)
                logger.info(f"Learned new pattern: {new_pattern.name}")
        
        return result
```

### 2. Pattern Matcher (Fast Path)

**Purpose**: Execute pre-compiled discovery patterns at high speed

**File**: `backend/src/core/pattern_matcher.py`

```python
from typing import List, Optional
import importlib.util
import hashlib

@dataclass
class PatternMatch:
    pattern_id: str
    pattern_version: str
    confidence: float
    matched_indicators: List[str]

@dataclass
class Pattern:
    id: str
    name: str
    version: str
    category: str
    detection_code: str  # Python code as string
    discovery_code: str  # Python code as string
    metadata: Dict[str, Any]
    
class PatternMatcher:
    def __init__(self, pattern_store: PatternStore):
        self.pattern_store = pattern_store
        self.compiled_patterns = {}
        self._load_patterns()
    
    def _load_patterns(self):
        """
        Load and compile all patterns at startup
        """
        patterns = self.pattern_store.get_all_active()
        
        for pattern in patterns:
            # Compile pattern code into executable functions
            detection_fn = self._compile_code(pattern.detection_code)
            discovery_fn = self._compile_code(pattern.discovery_code)
            
            self.compiled_patterns[pattern.id] = {
                'pattern': pattern,
                'detect': detection_fn,
                'discover': discovery_fn
            }
    
    async def match(self, context: DiscoveryContext) -> PatternMatch:
        """
        Try to match scan result against known patterns
        """
        best_match = None
        best_confidence = 0.0
        
        for pattern_id, compiled in self.compiled_patterns.items():
            try:
                # Run detection function
                result = compiled['detect'](context.scan_result)
                
                if result['matches'] and result['confidence'] > best_confidence:
                    best_confidence = result['confidence']
                    best_match = PatternMatch(
                        pattern_id=pattern_id,
                        pattern_version=compiled['pattern'].version,
                        confidence=result['confidence'],
                        matched_indicators=result.get('indicators', [])
                    )
            except Exception as e:
                logger.error(f"Pattern {pattern_id} detection failed: {e}")
                continue
        
        return best_match or PatternMatch(
            pattern_id="unknown",
            pattern_version="0.0.0",
            confidence=0.0,
            matched_indicators=[]
        )
    
    def _compile_code(self, code: str) -> callable:
        """
        Safely compile pattern code into executable function
        """
        # Create isolated namespace with only safe imports
        namespace = {
            'requests': requests,
            'json': json,
            're': re,
            # Add other safe modules
        }
        
        # Compile and execute code in namespace
        exec(code, namespace)
        
        # Return the function from namespace
        return namespace.get('detect') or namespace.get('discover')
    
    async def add_pattern(self, pattern: Pattern):
        """
        Add new learned pattern to matcher
        """
        # Store pattern
        await self.pattern_store.save(pattern)
        
        # Compile and add to runtime patterns
        detection_fn = self._compile_code(pattern.detection_code)
        discovery_fn = self._compile_code(pattern.discovery_code)
        
        self.compiled_patterns[pattern.id] = {
            'pattern': pattern,
            'detect': detection_fn,
            'discover': discovery_fn
        }
        
        logger.info(f"Added pattern {pattern.id} v{pattern.version}")
```

### 3. AI Agent Coordinator

**Purpose**: Orchestrate multiple specialized AI agents for intelligent discovery

**File**: `backend/src/ai/agent_coordinator.py`

```python
from langchain.agents import AgentExecutor
from langchain.tools import Tool
from langchain_anthropic import ChatAnthropic

class AIAgentCoordinator:
    def __init__(self, llm_config: Dict[str, Any]):
        self.llm = ChatAnthropic(
            model="claude-sonnet-4.5",
            temperature=0.1,
            **llm_config
        )
        
        self.tools = self._initialize_tools()
        self.agent_executor = self._create_agent()
        self.discovery_trace = []
        
    def _initialize_tools(self) -> List[Tool]:
        """
        Initialize discovery tools available to AI agent
        """
        return [
            Tool(
                name="nmap_scan",
                func=self._nmap_scan,
                description="Scan ports and services on target host"
            ),
            Tool(
                name="http_probe",
                func=self._http_probe,
                description="Probe HTTP/HTTPS endpoints"
            ),
            Tool(
                name="ssh_execute",
                func=self._ssh_execute,
                description="Execute command via SSH"
            ),
            Tool(
                name="read_config",
                func=self._read_config,
                description="Read and parse configuration files"
            ),
            Tool(
                name="snmp_walk",
                func=self._snmp_walk,
                description="Query SNMP MIBs"
            ),
            # Add more tools...
        ]
    
    async def intelligent_discover(
        self, 
        context: DiscoveryContext
    ) -> DiscoveryResult:
        """
        Use AI agent to discover unknown service
        """
        self.discovery_trace = []
        
        discovery_prompt = f"""
        You are an infrastructure discovery agent. Your task is to identify and map 
        the service running on {context.target_host}:{context.target_port}.
        
        Initial scan data:
        {json.dumps(context.scan_result, indent=2)}
        
        Available credentials:
        {json.dumps(context.credentials, indent=2) if context.credentials else "None"}
        
        Your goal:
        1. Identify the service type and version
        2. Discover all dependencies (databases, caches, queues, etc.)
        3. Map configuration and relationships
        4. Document discovery steps for pattern learning
        
        Use available tools strategically. Think step by step.
        Document your reasoning and findings clearly.
        """
        
        # Execute agent
        result = await self.agent_executor.ainvoke({
            "input": discovery_prompt,
            "context": context
        })
        
        # Parse agent output into structured result
        discovery_result = self._parse_agent_output(result)
        
        return discovery_result
    
    def found_new_pattern(self) -> bool:
        """
        Determine if AI discovered a repeatable pattern
        """
        # Check if discovery steps are generic enough to be a pattern
        if len(self.discovery_trace) < 3:
            return False
        
        # Check if steps follow a consistent pattern
        step_types = [step['type'] for step in self.discovery_trace]
        
        # If similar sequence has been seen multiple times, it's a pattern
        pattern_signature = hashlib.md5(
            json.dumps(step_types).encode()
        ).hexdigest()
        
        # Query pattern store for similar signatures
        similar_count = self.pattern_store.count_similar_signatures(
            pattern_signature
        )
        
        return similar_count >= 3  # Pattern threshold
    
    @property
    def last_discovery_trace(self) -> List[Dict[str, Any]]:
        """
        Return trace of last AI discovery for pattern compilation
        """
        return self.discovery_trace
```

### 4. Pattern Compiler

**Purpose**: Convert AI discovery traces into executable code patterns

**File**: `backend/src/ai/pattern_compiler.py`

```python
class PatternCompiler:
    def __init__(self, llm: ChatAnthropic):
        self.llm = llm
    
    async def codify(
        self, 
        discovery_trace: List[Dict[str, Any]]
    ) -> Pattern:
        """
        Convert AI discovery trace into code pattern
        """
        
        # Analyze trace to extract pattern structure
        analysis = await self._analyze_trace(discovery_trace)
        
        # Generate detection code
        detection_code = await self._generate_detection_code(analysis)
        
        # Generate discovery code
        discovery_code = await self._generate_discovery_code(analysis)
        
        # Generate metadata
        metadata = self._generate_metadata(analysis)
        
        # Create pattern object
        pattern = Pattern(
            id=self._generate_pattern_id(analysis),
            name=analysis['suggested_name'],
            version="1.0.0",
            category=analysis['category'],
            detection_code=detection_code,
            discovery_code=discovery_code,
            metadata=metadata
        )
        
        return pattern
    
    async def _generate_detection_code(
        self, 
        analysis: Dict[str, Any]
    ) -> str:
        """
        Use LLM to generate detection function code
        """
        
        prompt = f"""
        Generate a Python detection function based on this analysis:
        
        Service Type: {analysis['service_type']}
        Key Indicators: {analysis['indicators']}
        Detection Methods: {analysis['detection_methods']}
        
        Requirements:
        1. Function must be named 'detect'
        2. Takes scan_result dict as parameter
        3. Returns dict with 'matches' (bool) and 'confidence' (float 0-1)
        4. Should check multiple indicators for robustness
        5. Use only standard library and provided modules
        
        Example structure:
        ```python
        def detect(scan_result):
            confidence = 0.0
            indicators = []
            
            # Check banner
            if 'spring' in scan_result.get('banner', '').lower():
                confidence += 0.4
                indicators.append('spring_banner')
            
            # Check endpoints
            if '/actuator' in scan_result.get('endpoints', []):
                confidence += 0.6
                indicators.append('actuator_endpoint')
            
            return {{
                'matches': confidence > 0.5,
                'confidence': min(confidence, 1.0),
                'indicators': indicators
            }}
        ```
        
        Generate the detection function:
        """
        
        response = await self.llm.ainvoke(prompt)
        
        # Extract code from response
        code = self._extract_code_from_response(response.content)
        
        return code
    
    async def _generate_discovery_code(
        self, 
        analysis: Dict[str, Any]
    ) -> str:
        """
        Use LLM to generate discovery function code
        """
        
        prompt = f"""
        Generate a Python discovery function based on this analysis:
        
        Service Type: {analysis['service_type']}
        Discovery Steps: {json.dumps(analysis['discovery_steps'], indent=2)}
        Expected Data: {json.dumps(analysis['expected_data'], indent=2)}
        
        Requirements:
        1. Function must be named 'discover'
        2. Takes host (str) and port (int) as parameters
        3. Returns dict with discovered service details
        4. Should be fast and efficient (no unnecessary waits)
        5. Include error handling
        6. Use async/await patterns
        
        Generate the discovery function:
        """
        
        response = await self.llm.ainvoke(prompt)
        code = self._extract_code_from_response(response.content)
        
        return code
```

---

## Data Models

### Database Schema

**File**: `backend/src/models/schema.py`

```python
from sqlalchemy import Column, Integer, String, DateTime, JSON, Float, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

# Association table for many-to-many relationships
ci_relationships = Table(
    'ci_relationships',
    Base.metadata,
    Column('source_ci_id', Integer, ForeignKey('configuration_items.id')),
    Column('target_ci_id', Integer, ForeignKey('configuration_items.id')),
    Column('relationship_type', String(100)),
    Column('metadata', JSON)
)

class ConfigurationItem(Base):
    """
    Core CMDB Configuration Item
    """
    __tablename__ = 'configuration_items'
    
    id = Column(Integer, primary_key=True)
    ci_type = Column(String(100), nullable=False, index=True)  # server, database, app, etc.
    name = Column(String(255), nullable=False)
    hostname = Column(String(255), index=True)
    ip_address = Column(String(45), index=True)
    
    # Discovery metadata
    discovered_by = Column(String(100))  # pattern_id or 'ai_agent'
    discovery_timestamp = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)
    confidence_score = Column(Float)
    
    # Attributes stored as JSON
    attributes = Column(JSON)  # Flexible schema for different CI types
    
    # Environment context
    environment = Column(String(50))  # prod, staging, dev
    tags = Column(JSON)
    
    # Relationships
    dependencies = relationship(
        'ConfigurationItem',
        secondary=ci_relationships,
        primaryjoin=id == ci_relationships.c.source_ci_id,
        secondaryjoin=id == ci_relationships.c.target_ci_id,
        backref='dependents'
    )
    
    # Discovery history
    discovery_sessions = relationship('DiscoverySession', back_populates='ci')

class DiscoverySession(Base):
    """
    Track discovery operations
    """
    __tablename__ = 'discovery_sessions'
    
    id = Column(Integer, primary_key=True)
    session_id = Column(String(100), unique=True, index=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    status = Column(String(50))  # running, completed, failed
    
    # Discovery scope
    target_range = Column(String(255))
    target_count = Column(Integer)
    discovered_count = Column(Integer)
    
    # Strategy used
    strategy = Column(String(50))  # pattern, ai, hybrid
    
    # Results
    ci_id = Column(Integer, ForeignKey('configuration_items.id'))
    ci = relationship('ConfigurationItem', back_populates='discovery_sessions')
    
    # Trace for learning
    discovery_trace = Column(JSON)
    
    # Performance metrics
    duration_seconds = Column(Float)
    ai_cost = Column(Float)  # LLM API cost

class Pattern(Base):
    """
    Discovery patterns (both local and community)
    """
    __tablename__ = 'patterns'
    
    id = Column(Integer, primary_key=True)
    pattern_id = Column(String(100), unique=True, index=True)
    name = Column(String(255))
    version = Column(String(50))
    
    # Pattern code
    detection_code = Column(String)  # Python code
    discovery_code = Column(String)  # Python code
    
    # Metadata
    category = Column(String(100), index=True)
    description = Column(String)
    author = Column(String(255))
    license = Column(String(50))
    
    # Quality metrics
    confidence_score = Column(Float)
    usage_count = Column(Integer, default=0)
    success_rate = Column(Float, default=0.0)
    avg_discovery_time = Column(Float)
    
    # Community metrics (if synced from registry)
    community_upvotes = Column(Integer, default=0)
    community_downvotes = Column(Integer, default=0)
    
    # Validation
    test_cases = Column(JSON)
    is_validated = Column(Boolean, default=False)
    
    # Provenance
    learned_from_session = Column(String(100))  # Link to discovery session
    ai_model_used = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Registry sync
    registry_url = Column(String(255))  # If pulled from community
    last_synced = Column(DateTime)

class Credential(Base):
    """
    Secure credential storage (encrypted)
    """
    __tablename__ = 'credentials'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255))
    credential_type = Column(String(50))  # ssh_key, password, token, etc.
    
    # Encrypted credentials (use Fernet or vault integration)
    encrypted_data = Column(String)
    
    # Scope
    applicable_to = Column(JSON)  # Tags, IP ranges, etc.
    priority = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used = Column(DateTime)
    usage_count = Column(Integer, default=0)
    success_rate = Column(Float)

class PatternUsage(Base):
    """
    Track pattern performance
    """
    __tablename__ = 'pattern_usage'
    
    id = Column(Integer, primary_key=True)
    pattern_id = Column(String(100), ForeignKey('patterns.pattern_id'))
    session_id = Column(String(100), ForeignKey('discovery_sessions.session_id'))
    
    success = Column(Boolean)
    execution_time = Column(Float)
    error_message = Column(String)
    
    timestamp = Column(DateTime, default=datetime.utcnow)
```

---

## API Specifications

### REST API Endpoints

**File**: `backend/src/api/routes/discovery.py`

```python
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/api/v1/discovery", tags=["discovery"])

class DiscoveryRequest(BaseModel):
    target: str  # IP, range, or hostname
    scan_type: str = "standard"  # standard, deep, quick
    credentials: Optional[List[str]] = None  # Credential IDs
    tags: Optional[Dict[str, str]] = None

class DiscoveryResponse(BaseModel):
    session_id: str
    status: str
    message: str

@router.post("/scan", response_model=DiscoveryResponse)
async def initiate_scan(
    request: DiscoveryRequest,
    background_tasks: BackgroundTasks,
    orchestrator: DiscoveryOrchestrator = Depends(get_orchestrator)
):
    """
    Initiate a discovery scan
    """
    # Validate target
    targets = parse_target_range(request.target)
    
    # Create discovery session
    session = DiscoverySession(
        session_id=generate_session_id(),
        target_range=request.target,
        target_count=len(targets),
        status="running"
    )
    await session.save()
    
    # Queue discovery task
    background_tasks.add_task(
        run_discovery,
        session_id=session.session_id,
        targets=targets,
        credentials=request.credentials,
        tags=request.tags
    )
    
    return DiscoveryResponse(
        session_id=session.session_id,
        status="started",
        message=f"Discovery initiated for {len(targets)} targets"
    )

@router.get("/session/{session_id}")
async def get_session_status(session_id: str):
    """
    Get discovery session status
    """
    session = await DiscoverySession.get(session_id=session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "session_id": session.session_id,
        "status": session.status,
        "discovered": session.discovered_count,
        "total": session.target_count,
        "started_at": session.started_at,
        "duration": session.duration_seconds
    }

@router.get("/ci/{ci_id}")
async def get_configuration_item(ci_id: int):
    """
    Get configuration item details
    """
    ci = await ConfigurationItem.get(id=ci_id)
    
    if not ci:
        raise HTTPException(status_code=404, detail="CI not found")
    
    return {
        "id": ci.id,
        "type": ci.ci_type,
        "name": ci.name,
        "hostname": ci.hostname,
        "ip_address": ci.ip_address,
        "attributes": ci.attributes,
        "dependencies": [
            {"id": dep.id, "name": dep.name, "type": dep.ci_type}
            for dep in ci.dependencies
        ],
        "discovered_by": ci.discovered_by,
        "discovery_timestamp": ci.discovery_timestamp
    }

@router.get("/service-map/{ci_id}")
async def get_service_map(ci_id: int, depth: int = 2):
    """
    Get service dependency map
    """
    ci = await ConfigurationItem.get(id=ci_id)
    
    if not ci:
        raise HTTPException(status_code=404, detail="CI not found")
    
    # Build dependency graph
    graph = await build_dependency_graph(ci, max_depth=depth)
    
    return graph
```

**File**: `backend/src/api/routes/patterns.py`

```python
@router.get("/patterns", response_model=List[PatternSummary])
async def list_patterns(
    category: Optional[str] = None,
    min_confidence: float = 0.7,
    limit: int = 100
):
    """
    List available patterns
    """
    patterns = await Pattern.query(
        category=category,
        confidence_score__gte=min_confidence,
        limit=limit
    )
    
    return [
        PatternSummary(
            id=p.pattern_id,
            name=p.name,
            version=p.version,
            category=p.category,
            confidence=p.confidence_score,
            usage_count=p.usage_count,
            success_rate=p.success_rate
        )
        for p in patterns
    ]

@router.get("/patterns/{pattern_id}")
async def get_pattern_details(pattern_id: str):
    """
    Get pattern details
    """
    pattern = await Pattern.get(pattern_id=pattern_id)
    
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")
    
    return {
        "id": pattern.pattern_id,
        "name": pattern.name,
        "version": pattern.version,
        "description": pattern.description,
        "category": pattern.category,
        "detection_code": pattern.detection_code,
        "discovery_code": pattern.discovery_code,
        "test_cases": pattern.test_cases,
        "metrics": {
            "confidence": pattern.confidence_score,
            "usage_count": pattern.usage_count,
            "success_rate": pattern.success_rate,
            "avg_time": pattern.avg_discovery_time
        },
        "community": {
            "upvotes": pattern.community_upvotes,
            "downvotes": pattern.community_downvotes
        }
    }

@router.post("/patterns/publish")
async def publish_pattern(
    pattern: PatternCreate,
    registry_client: RegistryClient = Depends(get_registry_client)
):
    """
    Publish pattern to community registry
    """
    # Validate pattern
    validation = await validate_pattern(pattern)
    
    if not validation.is_valid:
        raise HTTPException(
            status_code=400,
            detail=f"Pattern validation failed: {validation.errors}"
        )
    
    # AI security review
    security_review = await ai_security_review(pattern)
    
    if not security_review.is_safe:
        raise HTTPException(
            status_code=400,
            detail=f"Security review failed: {security_review.issues}"
        )
    
    # Publish to registry
    result = await registry_client.publish(pattern)
    
    return {
        "pattern_id": result.pattern_id,
        "version": result.version,
        "registry_url": result.url,
        "status": "published"
    }
```

### WebSocket API for Real-time Updates

**File**: `backend/src/api/websocket.py`

```python
from fastapi import WebSocket, WebSocketDisconnect
from typing import Set

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()

@router.websocket("/ws/discovery/{session_id}")
async def discovery_updates(websocket: WebSocket, session_id: str):
    """
    Real-time discovery updates
    """
    await manager.connect(websocket)
    
    try:
        # Subscribe to Redis pub/sub for session updates
        async for message in redis_subscribe(f"discovery:{session_id}"):
            await websocket.send_json(message)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
```

---

## Pattern System

### Pattern File Format (YAML)

```yaml
# patterns/spring-boot-actuator.yaml
pattern:
  id: "spring-boot-actuator"
  version: "1.2.0"
  name: "Spring Boot Actuator Discovery"
  category: "java-frameworks"
  description: "Discovers Spring Boot applications via Actuator endpoints"
  author: "community"
  license: "MIT"

metadata:
  technology: "Spring Boot"
  protocols: ["http", "https"]
  default_ports: [8080, 8081, 8090]
  confidence_threshold: 0.85
  avg_discovery_time: 2.3
  
detection:
  code: |
    def detect(scan_result):
        confidence = 0.0
        indicators = []
        
        # Check banner
        banner = scan_result.get('banner', '').lower()
        if 'spring' in banner or 'boot' in banner:
            confidence += 0.3
            indicators.append('spring_banner')
        
        # Check HTTP headers
        headers = scan_result.get('http_headers', {})
        if 'X-Application-Context' in headers:
            confidence += 0.4
            indicators.append('spring_header')
        
        # Check endpoints
        endpoints = scan_result.get('endpoints', [])
        if '/actuator' in endpoints or '/actuator/health' in endpoints:
            confidence += 0.5
            indicators.append('actuator_endpoint')
        
        return {
            'matches': confidence >= 0.5,
            'confidence': min(confidence, 1.0),
            'indicators': indicators
        }

discovery:
  code: |
    import aiohttp
    import asyncio
    
    async def discover(host, port):
        base_url = f"http://{host}:{port}"
        result = {
            'service_type': 'spring-boot',
            'attributes': {},
            'dependencies': []
        }
        
        async with aiohttp.ClientSession() as session:
            # Get app info
            try:
                async with session.get(f"{base_url}/actuator/info", timeout=5) as resp:
                    if resp.status == 200:
                        info = await resp.json()
                        result['attributes']['app_info'] = info
                        result['attributes']['version'] = info.get('app', {}).get('version')
            except:
                pass
            
            # Get environment
            try:
                async with session.get(f"{base_url}/actuator/env", timeout=5) as resp:
                    if resp.status == 200:
                        env = await resp.json()
                        
                        # Extract database
                        db_url = env.get('propertySources', [{}])[0].get('properties', {}).get('spring.datasource.url', {}).get('value')
                        if db_url:
                            result['dependencies'].append({
                                'type': 'database',
                                'connection': db_url
                            })
                        
                        # Extract Redis
                        redis_host = env.get('propertySources', [{}])[0].get('properties', {}).get('spring.redis.host', {}).get('value')
                        if redis_host:
                            result['dependencies'].append({
                                'type': 'cache',
                                'technology': 'redis',
                                'host': redis_host
                            })
                        
                        # Extract Kafka
                        kafka_brokers = env.get('propertySources', [{}])[0].get('properties', {}).get('spring.kafka.bootstrap-servers', {}).get('value')
                        if kafka_brokers:
                            result['dependencies'].append({
                                'type': 'message_queue',
                                'technology': 'kafka',
                                'brokers': kafka_brokers
                            })
            except:
                pass
            
            # Get metrics
            try:
                async with session.get(f"{base_url}/actuator/metrics", timeout=5) as resp:
                    if resp.status == 200:
                        metrics = await resp.json()
                        result['attributes']['available_metrics'] = metrics.get('names', [])
            except:
                pass
        
        return result

validation:
  test_cases:
    - name: "Detect via banner"
      input:
        banner: "Spring Boot v2.7.0"
      expected:
        matches: true
        confidence_min: 0.3
        
    - name: "Detect via endpoint"
      input:
        endpoints: ["/actuator/health", "/actuator/info"]
      expected:
        matches: true
        confidence_min: 0.5
        
    - name: "Full discovery"
      input:
        host: "testserver.local"
        port: 8080
      mock_responses:
        - endpoint: "/actuator/info"
          response: '{"app": {"name": "test-service", "version": "1.0.0"}}'
        - endpoint: "/actuator/env"
          response: '{"propertySources": [{"properties": {"spring.datasource.url": {"value": "jdbc:postgresql://db:5432/mydb"}}}]}'
      expected:
        service_type: "spring-boot"
        dependencies_count_min: 1

provenance:
  learned_from: "42 successful discoveries"
  ai_model: "claude-sonnet-4.5"
  created_at: "2025-10-01T10:30:00Z"
  contributors: ["user123", "user456"]
  
community:
  registry_url: "https://patterns.discovery-cmdb.org/patterns/spring-boot-actuator"
  upvotes: 1247
  downvotes: 23
  usage_count: 15847
  forks: 156
```

### Pattern Loader

**File**: `backend/src/core/pattern_loader.py`

```python
import yaml
from pathlib import Path

class PatternLoader:
    def __init__(self, patterns_dir: Path):
        self.patterns_dir = patterns_dir
    
    async def load_all_patterns(self) -> List[Pattern]:
        """
        Load all pattern files from directory
        """
        patterns = []
        
        for pattern_file in self.patterns_dir.glob("**/*.yaml"):
            try:
                pattern = await self.load_pattern_file(pattern_file)
                patterns.append(pattern)
            except Exception as e:
                logger.error(f"Failed to load pattern {pattern_file}: {e}")
        
        return patterns
    
    async def load_pattern_file(self, filepath: Path) -> Pattern:
        """
        Load single pattern from YAML file
        """
        with open(filepath, 'r') as f:
            data = yaml.safe_load(f)
        
        pattern_data = data['pattern']
        
        return Pattern(
            pattern_id=pattern_data['id'],
            name=pattern_data['name'],
            version=pattern_data['version'],
            category=pattern_data['category'],
            description=pattern_data.get('description', ''),
            author=pattern_data.get('author', 'unknown'),
            license=pattern_data.get('license', 'MIT'),
            detection_code=data['detection']['code'],
            discovery_code=data['discovery']['code'],
            test_cases=data.get('validation', {}).get('test_cases', []),
            metadata=data.get('metadata', {})
        )
```

---

## AI Agent System

### Agent Tools Implementation

**File**: `backend/src/ai/tools.py`

```python
import nmap
import paramiko
from pysnmp.hlapi import *
import aiohttp

class DiscoveryTools:
    """
    Tools available to AI agents
    """
    
    @staticmethod
    async def nmap_scan(host: str, ports: str = "1-1000") -> Dict:
        """
        Perform NMAP scan
        """
        nm = nmap.PortScanner()
        nm.scan(host, ports, arguments='-sV -sC')
        
        results = {
            'host': host,
            'status': nm[host].state() if host in nm.all_hosts() else 'unknown',
            'ports': []
        }
        
        if host in nm.all_hosts():
            for proto in nm[host].all_protocols():
                ports = nm[host][proto].keys()
                for port in ports:
                    port_info = nm[host][proto][port]
                    results['ports'].append({
                        'port': port,
                        'protocol': proto,
                        'state': port_info['state'],
                        'service': port_info.get('name', 'unknown'),
                        'version': port_info.get('version', ''),
                        'product': port_info.get('product', '')
                    })
        
        return results
    
    @staticmethod
    async def http_probe(
        host: str, 
        port: int, 
        endpoints: List[str] = ['/']
    ) -> Dict:
        """
        Probe HTTP endpoints
        """
        results = {
            'host': host,
            'port': port,
            'endpoints': {}
        }
        
        async with aiohttp.ClientSession() as session:
            for endpoint in endpoints:
                url = f"http://{host}:{port}{endpoint}"
                try:
                    async with session.get(url, timeout=5) as resp:
                        results['endpoints'][endpoint] = {
                            'status': resp.status,
                            'headers': dict(resp.headers),
                            'content': await resp.text() if resp.status == 200 else None
                        }
                except Exception as e:
                    results['endpoints'][endpoint] = {
                        'error': str(e)
                    }
        
        return results
    
    @staticmethod
    async def ssh_execute(
        host: str,
        port: int,
        username: str,
        password: str = None,
        key_filename: str = None,
        command: str = "uname -a"
    ) -> Dict:
        """
        Execute command via SSH
        """
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        try:
            client.connect(
                host,
                port=port,
                username=username,
                password=password,
                key_filename=key_filename,
                timeout=10
            )
            
            stdin, stdout, stderr = client.exec_command(command)
            
            return {
                'success': True,
                'stdout': stdout.read().decode(),
                'stderr': stderr.read().decode(),
                'exit_code': stdout.channel.recv_exit_status()
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
        
        finally:
            client.close()
    
    @staticmethod
    async def read_config_file(
        host: str,
        port: int,
        filepath: str,
        credentials: Dict
    ) -> Dict:
        """
        Read and parse config file via SSH
        """
        # Execute SSH to read file
        result = await DiscoveryTools.ssh_execute(
            host=host,
            port=port,
            command=f"cat {filepath}",
            **credentials
        )
        
        if not result['success']:
            return {'error': result['error']}
        
        content = result['stdout']
        
        # Try to parse based on file extension
        if filepath.endswith('.json'):
            return {'type': 'json', 'data': json.loads(content)}
        elif filepath.endswith('.yaml') or filepath.endswith('.yml'):
            return {'type': 'yaml', 'data': yaml.safe_load(content)}
        elif filepath.endswith('.properties'):
            return {'type': 'properties', 'data': parse_properties(content)}
        else:
            return {'type': 'text', 'data': content}
```

---

## Community Registry

### Registry Client

**File**: `backend/src/registry/client.py`

```python
import aiohttp
from typing import Optional

class RegistryClient:
    def __init__(self, registry_url: str, api_key: Optional[str] = None):
        self.registry_url = registry_url
        self.api_key = api_key
        self.session = None
    
    async def __aenter__(self):
        headers = {}
        if self.api_key:
            headers['Authorization'] = f"Bearer {self.api_key}"
        
        self.session = aiohttp.ClientSession(headers=headers)
        return self
    
    async def __aexit__(self, *args):
        await self.session.close()
    
    async def search_patterns(
        self,
        query: str = None,
        category: str = None,
        min_confidence: float = 0.7
    ) -> List[Dict]:
        """
        Search community patterns
        """
        params = {
            'query': query,
            'category': category,
            'min_confidence': min_confidence
        }
        
        async with self.session.get(
            f"{self.registry_url}/api/v1/patterns/search",
            params=params
        ) as resp:
            return await resp.json()
    
    async def pull_pattern(self, pattern_id: str, version: str = "latest") -> Pattern:
        """
        Download pattern from registry
        """
        async with self.session.get(
            f"{self.registry_url}/api/v1/patterns/{pattern_id}/versions/{version}"
        ) as resp:
            pattern_data = await resp.json()
            
            return Pattern(**pattern_data)
    
    async def publish_pattern(self, pattern: Pattern) -> Dict:
        """
        Publish pattern to registry
        """
        async with self.session.post(
            f"{self.registry_url}/api/v1/patterns",
            json=pattern.dict()
        ) as resp:
            return await resp.json()
    
    async def subscribe_updates(self, categories: List[str]):
        """
        Subscribe to pattern updates via WebSocket
        """
        ws_url = self.registry_url.replace('http', 'ws') + '/ws/updates'
        
        async with self.session.ws_connect(ws_url) as ws:
            # Subscribe to categories
            await ws.send_json({
                'action': 'subscribe',
                'categories': categories
            })
            
            # Listen for updates
            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    data = json.loads(msg.data)
                    yield data
```

### Pattern Sync Service

**File**: `backend/src/registry/sync_service.py`

```python
class PatternSyncService:
    """
    Sync patterns between local and community registry
    """
    
    def __init__(
        self,
        local_store: PatternStore,
        registry_client: RegistryClient
    ):
        self.local_store = local_store
        self.registry_client = registry_client
    
    async def sync_from_registry(
        self,
        categories: List[str] = None,
        auto_install: bool = True
    ):
        """
        Pull latest patterns from registry
        """
        # Get patterns from registry
        patterns = await self.registry_client.search_patterns(
            category=categories
        )
        
        for pattern_meta in patterns:
            # Check if we have this pattern locally
            local_pattern = await self.local_store.get(
                pattern_id=pattern_meta['id']
            )
            
            # Compare versions
            if not local_pattern or self._is_newer_version(
                pattern_meta['version'],
                local_pattern.version
            ):
                # Pull full pattern
                pattern = await self.registry_client.pull_pattern(
                    pattern_meta['id'],
                    pattern_meta['version']
                )
                
                # Validate pattern
                if await self._validate_pattern(pattern):
                    if auto_install:
                        await self.local_store.save(pattern)
                        logger.info(f"Synced pattern {pattern.pattern_id} v{pattern.version}")
                    else:
                        # Queue for review
                        await self._queue_for_review(pattern)
    
    async def publish_local_pattern(self, pattern_id: str):
        """
        Publish local pattern to community registry
        """
        pattern = await self.local_store.get(pattern_id=pattern_id)
        
        if not pattern:
            raise ValueError(f"Pattern {pattern_id} not found")
        
        # Validate before publishing
        validation = await self._validate_pattern(pattern)
        if not validation.is_valid:
            raise ValueError(f"Pattern validation failed: {validation.errors}")
        
        # AI security review
        security_review = await self._ai_security_review(pattern)
        if not security_review.is_safe:
            raise ValueError(f"Security review failed: {security_review.issues}")
        
        # Publish
        result = await self.registry_client.publish_pattern(pattern)
        
        # Update local pattern with registry info
        pattern.registry_url = result['url']
        pattern.last_synced = datetime.utcnow()
        await self.local_store.save(pattern)
        
        return result
```

---

## Security & Authentication

### Credential Management

**File**: `backend/src/security/credentials.py`

```python
from cryptography.fernet import Fernet
from typing import Optional
import os

class CredentialManager:
    """
    Secure credential storage and retrieval
    """
    
    def __init__(self, encryption_key: Optional[bytes] = None):
        if encryption_key:
            self.cipher = Fernet(encryption_key)
        else:
            # Load from environment or generate
            key = os.getenv('ENCRYPTION_KEY')
            if not key:
                key = Fernet.generate_key()
                logger.warning("Generated new encryption key - set ENCRYPTION_KEY env var!")
            self.cipher = Fernet(key if isinstance(key, bytes) else key.encode())
    
    async def store_credential(
        self,
        name: str,
        credential_type: str,
        data: Dict[str, Any],
        applicable_to: Dict[str, Any] = None
    ) -> Credential:
        """
        Store encrypted credential
        """
        # Encrypt credential data
        encrypted_data = self.cipher.encrypt(
            json.dumps(data).encode()
        )
        
        credential = Credential(
            name=name,
            credential_type=credential_type,
            encrypted_data=encrypted_data.decode(),
            applicable_to=applicable_to or {}
        )
        
        await credential.save()
        return credential
    
    async def get_credential(self, credential_id: int) -> Dict[str, Any]:
        """
        Retrieve and decrypt credential
        """
        credential = await Credential.get(id=credential_id)
        
        if not credential:
            raise ValueError(f"Credential {credential_id} not found")
        
        # Decrypt
        decrypted_data = self.cipher.decrypt(
            credential.encrypted_data.encode()
        )
        
        return json.loads(decrypted_data)
    
    async def find_applicable_credentials(
        self,
        target_host: str,
        target_port: int,
        tags: Dict[str, str] = None
    ) -> List[Credential]:
        """
        Find credentials applicable to target
        """
        # Query credentials with matching scope
        credentials = await Credential.query_applicable(
            host=target_host,
            port=target_port,
            tags=tags
        )
        
        # Sort by priority and success rate
        credentials.sort(
            key=lambda c: (c.priority, c.success_rate or 0),
            reverse=True
        )
        
        return credentials
```

### API Authentication

**File**: `backend/src/security/auth.py`

```python
from fastapi import Security, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from datetime import datetime, timedelta

security = HTTPBearer()

class AuthService:
    def __init__(self, secret_key: str):
        self.secret_key = secret_key
    
    def create_access_token(
        self,
        user_id: str,
        expires_delta: timedelta = timedelta(hours=24)
    ) -> str:
        """
        Create JWT access token
        """
        payload = {
            'user_id': user_id,
            'exp': datetime.utcnow() + expires_delta,
            'iat': datetime.utcnow()
        }
        
        return jwt.encode(payload, self.secret_key, algorithm='HS256')
    
    def verify_token(self, token: str) -> Dict:
        """
        Verify and decode JWT token
        """
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=['HS256']
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Dependency to get current authenticated user
    """
    payload = auth_service.verify_token(credentials.credentials)
    user = await User.get(id=payload['user_id'])
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user
```

---

## Deployment Architecture

### Docker Compose Configuration

**File**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: discovery_cmdb
      POSTGRES_USER: discovery
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-EXEC", "pg_isready -U discovery"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache & Queue
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # Vector Database
  chromadb:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    volumes:
      - chroma_data:/chroma/chroma
    environment:
      - IS_PERSISTENT=TRUE

  # API Backend
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgresql://discovery:${DB_PASSWORD}@postgres:5432/discovery_cmdb
      - REDIS_URL=redis://redis:6379
      - CHROMA_URL=http://chromadb:8000
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend:/app
      - discovery_patterns:/app/patterns

  # Celery Worker
  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: celery -A src.tasks worker --loglevel=info --concurrency=4
    environment:
      - DATABASE_URL=postgresql://discovery:${DB_PASSWORD}@postgres:5432/discovery_cmdb
      - REDIS_URL=redis://redis:6379
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app

  # Celery Beat (Scheduler)
  beat:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: celery -A src.tasks beat --loglevel=info
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:8080
    volumes:
      - ./frontend:/app
      - /app/node_modules

  # Pattern Registry (optional, for self-hosted)
  registry:
    build:
      context: ./registry
      dockerfile: Dockerfile
    ports:
      - "8081:8081"
    environment:
      - DATABASE_URL=postgresql://discovery:${DB_PASSWORD}@postgres:5432/pattern_registry
      - S3_ENDPOINT=${S3_ENDPOINT}
      - S3_BUCKET=discovery-patterns
    depends_on:
      - postgres

volumes:
  postgres_data:
  redis_data:
  chroma_data:
  discovery_patterns:
```

### Kubernetes Deployment (Optional)

**File**: `k8s/deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: discovery-api
  namespace: discovery-cmdb
spec:
  replicas: 3
  selector:
    matchLabels:
      app: discovery-api
  template:
    metadata:
      labels:
        app: discovery-api
    spec:
      containers:
      - name: api
        image: discovery-cmdb/api:latest
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: discovery-secrets
              key: database-url
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: discovery-secrets
              key: anthropic-api-key
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: discovery-api-service
  namespace: discovery-cmdb
spec:
  selector:
    app: discovery-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: LoadBalancer