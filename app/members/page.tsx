"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as d3Force from "d3-force";
import {
  loadProjects,
  loadMembers,
  loadGBMs,
  loadAttendance,
  loadAssignments,
  calculateTotalLifetimeMembers,
  calculateActiveMembersCount,
  calculateInactiveMembersCount,
  calculateTechToNonTechMembers,
  calculateAttendancePerGBM,
  calculateMembersPerYear,
  calculateAssociatesVsAnalysts,
  buildMemberNetwork,
} from "../../lib/data";
import { Project, Member, GBM, Attendance, Assignment, isSupabaseConfigured } from "../../lib/supabase";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line } from "recharts";

interface KPICardProps {
  title: string;
  value: string | number;
}

function KPICard({ title, value }: KPICardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {title}
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {value}
      </div>
    </div>
  );
}

// Types for the graph
interface GraphNode {
  id: string;
  name: string;
  group: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  fx?: number | null; // Fixed x position (for dragging)
  fy?: number | null; // Fixed y position (for dragging)
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number;
}

// Custom Force Graph Component
function ForceGraph({ 
  nodes: initialNodes, 
  links: initialLinks,
  width,
  height
}: { 
  nodes: Array<{ id: string; name: string; group: number }>; 
  links: Array<{ source: string; target: string; value: number }>;
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<d3Force.Simulation<GraphNode, GraphLink> | null>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const isDraggingRef = useRef(false);
  const isPanningRef = useRef(false);
  const draggedNodeRef = useRef<GraphNode | null>(null);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // Calculate node radius based on name length
  const getNodeRadius = useCallback((name: string) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.font = 'bold 11px "IBM Plex Mono", monospace';
      const textWidth = ctx.measureText(name).width;
      return Math.max(25, textWidth / 2 + 12);
    }
    return Math.max(25, name.length * 3.5 + 12);
  }, []);

  // Convert screen coordinates to graph coordinates
  const screenToGraph = useCallback((screenX: number, screenY: number) => {
    const t = transformRef.current;
    return {
      x: (screenX - t.x) / t.k,
      y: (screenY - t.y) / t.k
    };
  }, []);

  // Find node at position
  const findNodeAtPosition = useCallback((graphX: number, graphY: number): GraphNode | null => {
    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const node = nodesRef.current[i];
      const dx = graphX - node.x;
      const dy = graphY - node.y;
      if (dx * dx + dy * dy < node.radius * node.radius) {
        return node;
      }
    }
    return null;
  }, []);

  // Draw the graph
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const t = transformRef.current;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set up transform
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(t.x, t.y);
    ctx.scale(t.k, t.k);

    // Draw links first (behind nodes)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5 / t.k;
    
    linksRef.current.forEach(link => {
      const source = link.source as GraphNode;
      const target = link.target as GraphNode;
      
      if (source.x !== undefined && target.x !== undefined) {
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      }
    });

    // Draw nodes
    nodesRef.current.forEach(node => {
      if (node.x === undefined) return;

      // Node circle - gradient fill
      const gradient = ctx.createRadialGradient(
        node.x - node.radius * 0.3, 
        node.y - node.radius * 0.3, 
        0,
        node.x, 
        node.y, 
        node.radius
      );
      gradient.addColorStop(0, '#fef08a'); // Light yellow
      gradient.addColorStop(1, '#facc15'); // Yellow
      
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Node border
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2 / t.k;
      ctx.stroke();

      // Node text
      ctx.fillStyle = '#1e293b';
      ctx.font = `bold ${11 / t.k}px "IBM Plex Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Handle long names - truncate if needed
      let displayName = node.name;
      const maxWidth = node.radius * 1.8;
      if (ctx.measureText(displayName).width > maxWidth) {
        while (ctx.measureText(displayName + '...').width > maxWidth && displayName.length > 0) {
          displayName = displayName.slice(0, -1);
        }
        displayName += '...';
      }
      
      ctx.fillText(displayName, node.x, node.y);
    });

    ctx.restore();
  }, []);

  // Initialize simulation
  useEffect(() => {
    if (initialNodes.length === 0) return;

    // Create nodes with positions and radii
    const nodes: GraphNode[] = initialNodes.map((node, i) => {
      const radius = getNodeRadius(node.name);
      const angle = (i / initialNodes.length) * 2 * Math.PI;
      const initialRadius = Math.max(300, initialNodes.length * 25);
      
      return {
        ...node,
        x: Math.cos(angle) * initialRadius + width / 2,
        y: Math.sin(angle) * initialRadius + height / 2,
        vx: 0,
        vy: 0,
        radius
      };
    });

    // Create links
    const links: GraphLink[] = initialLinks.map(link => ({
      source: link.source,
      target: link.target,
      value: link.value
    }));

    nodesRef.current = nodes;
    linksRef.current = links;

    // Create simulation
    const simulation = d3Force.forceSimulation<GraphNode, GraphLink>(nodes)
      .force('link', d3Force.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(150)
        .strength(0.2)
      )
      .force('charge', d3Force.forceManyBody()
        .strength(-800)
        .distanceMax(600)
      )
      .force('center', d3Force.forceCenter(width / 2, height / 2).strength(0.05))
      .force('collide', d3Force.forceCollide<GraphNode>()
        .radius(d => d.radius + 8) // Add padding between nodes
        .strength(1)
        .iterations(4)
      )
      .force('x', d3Force.forceX(width / 2).strength(0.02))
      .force('y', d3Force.forceY(height / 2).strength(0.02))
      .alphaDecay(0.02)
      .velocityDecay(0.4);

    simulation.on('tick', draw);

    simulationRef.current = simulation;

    // Initial draw
    draw();

    return () => {
      simulation.stop();
    };
  }, [initialNodes, initialLinks, width, height, getNodeRadius, draw]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    draw();
  }, [width, height, draw]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const { x: graphX, y: graphY } = screenToGraph(screenX, screenY);

    const node = findNodeAtPosition(graphX, graphY);

    if (node) {
      isDraggingRef.current = true;
      draggedNodeRef.current = node;
      node.fx = node.x;
      node.fy = node.y;
      simulationRef.current?.alphaTarget(0.3).restart();
    } else {
      isPanningRef.current = true;
      lastMousePosRef.current = { x: screenX, y: screenY };
    }
  }, [screenToGraph, findNodeAtPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (isDraggingRef.current && draggedNodeRef.current) {
      const { x: graphX, y: graphY } = screenToGraph(screenX, screenY);
      draggedNodeRef.current.fx = graphX;
      draggedNodeRef.current.fy = graphY;
    } else if (isPanningRef.current) {
      const dx = screenX - lastMousePosRef.current.x;
      const dy = screenY - lastMousePosRef.current.y;
      transformRef.current.x += dx;
      transformRef.current.y += dy;
      lastMousePosRef.current = { x: screenX, y: screenY };
      draw();
    }
  }, [screenToGraph, draw]);

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current && draggedNodeRef.current) {
      draggedNodeRef.current.fx = null;
      draggedNodeRef.current.fy = null;
      simulationRef.current?.alphaTarget(0);
    }
    isDraggingRef.current = false;
    isPanningRef.current = false;
    draggedNodeRef.current = null;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newK = Math.min(Math.max(transformRef.current.k * scaleFactor, 0.2), 5);
    
    // Zoom toward mouse position
    const kDiff = newK / transformRef.current.k;
    transformRef.current.x = screenX - (screenX - transformRef.current.x) * kDiff;
    transformRef.current.y = screenY - (screenY - transformRef.current.y) * kDiff;
    transformRef.current.k = newK;
    
    draw();
  }, [draw]);

  // Center and fit graph
  const centerGraph = useCallback(() => {
    if (nodesRef.current.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodesRef.current.forEach(node => {
      minX = Math.min(minX, node.x - node.radius);
      maxX = Math.max(maxX, node.x + node.radius);
      minY = Math.min(minY, node.y - node.radius);
      maxY = Math.max(maxY, node.y + node.radius);
    });

    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const padding = 50;
    const scaleX = (width - padding * 2) / graphWidth;
    const scaleY = (height - padding * 2) / graphHeight;
    const k = Math.min(scaleX, scaleY, 1.5);

    transformRef.current = {
      x: width / 2 - centerX * k,
      y: height / 2 - centerY * k,
      k
    };

    draw();
  }, [width, height, draw]);

  // Auto-center after simulation settles
  useEffect(() => {
    const timer = setTimeout(centerGraph, 2000);
    return () => clearTimeout(timer);
  }, [centerGraph]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={centerGraph}
          className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
        >
          Center
        </button>
        <button
          onClick={() => {
            if (simulationRef.current) {
              simulationRef.current.alpha(1).restart();
            }
          }}
          className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
        >
          Reheat
        </button>
      </div>
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600">
        <span className="font-semibold">{initialNodes.length}</span> members • <span className="font-semibold">{initialLinks.length}</span> connections
      </div>
    </div>
  );
}

export default function MembersPage() {
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([]);
  const [quartersInitialized, setQuartersInitialized] = useState(false);
  
  // Data state
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [gbms, setGBMs] = useState<GBM[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  
  // Loading state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Graph dimensions
  const [graphDimensions, setGraphDimensions] = useState({ width: 800, height: 600 });
  const graphContainerRef = useRef<HTMLDivElement>(null);

  // Load data on component mount
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [
          projectsData,
          membersData,
          gbmsData,
          attendanceData,
          assignmentsData
        ] = await Promise.all([
          loadProjects(),
          loadMembers(),
          loadGBMs(),
          loadAttendance(),
          loadAssignments()
        ]);
        
        setProjects(projectsData);
        setMembers(membersData);
        setGBMs(gbmsData);
        setAttendance(attendanceData);
        setAssignments(assignmentsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred while loading data');
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, []);

  // Handle graph container resize
  useEffect(() => {
    const updateDimensions = () => {
      if (graphContainerRef.current) {
        const rect = graphContainerRef.current.getBoundingClientRect();
        setGraphDimensions({
          width: rect.width,
          height: rect.height
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    // Use ResizeObserver for more precise updates
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (graphContainerRef.current) {
      resizeObserver.observe(graphContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateDimensions);
      resizeObserver.disconnect();
    };
  }, []);

  const toggleQuarter = (quarter: string) => {
    setSelectedQuarters(prev =>
      prev.includes(quarter)
        ? prev.filter(q => q !== quarter)
        : [...prev, quarter]
    );
  };

  // Get unique quarters from the data
  const availableQuarters = useMemo(() => {
    const quarters = [...new Set([
      ...projects.map(p => p.quarter_id),
      ...gbms.map(g => g.quarter_id)
    ])].filter(Boolean).sort();
    return quarters;
  }, [projects, gbms]);

  // Initialize selected quarters with available data (only once)
  useEffect(() => {
    if (availableQuarters.length > 0 && !quartersInitialized && !loading) {
      setSelectedQuarters(availableQuarters);
      setQuartersInitialized(true);
    }
  }, [availableQuarters, quartersInitialized, loading]);

  // Calculate metrics
  const totalLifetimeMembers = calculateTotalLifetimeMembers(members);
  const activeMembers = calculateActiveMembersCount(members);
  const inactiveMembers = calculateInactiveMembersCount(members);
  const techNonTechMembers = calculateTechToNonTechMembers(members);
  const associatesAnalysts = calculateAssociatesVsAnalysts(members);
  
  // Chart data
  const attendancePerGBMData = calculateAttendancePerGBM(attendance, gbms, selectedQuarters);
  const membersPerYearData = calculateMembersPerYear(members);
  const techNonTechData = [
    { category: "Tech", count: techNonTechMembers.tech },
    { category: "Non-Tech", count: techNonTechMembers.nonTech }
  ];
  const associatesAnalystsData = [
    { category: "Associates", count: associatesAnalysts.associates },
    { category: "Analysts", count: associatesAnalysts.analysts }
  ];

  // Network graph data
  const networkData = useMemo(() => {
    return buildMemberNetwork(assignments, projects, members, selectedQuarters);
  }, [assignments, projects, members, selectedQuarters]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-lg max-w-md w-full">
          <div className="text-red-600 text-center">
            <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Members Dashboard</h1>
          {loading && (
            <div className="text-sm text-gray-500 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Loading data...
            </div>
          )}
          {!loading && !isSupabaseConfigured() && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="text-yellow-800 text-sm">
                <strong>⚠️ Supabase not configured:</strong> Please set up your environment variables in <code>.env.local</code> to connect to your database.
              </div>
            </div>
          )}
        </div>

        {/* Filters Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
            Filters
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Quarters
            </label>
            <div className="flex flex-wrap gap-2">
              {availableQuarters.map((quarter) => (
                <button
                  key={quarter}
                  onClick={() => toggleQuarter(quarter)}
                  disabled={loading}
                  className={`px-3 py-1 text-sm rounded-md border transition-colors disabled:opacity-50 ${
                    selectedQuarters.includes(quarter)
                      ? "bg-gray-100 border-gray-300 text-gray-900"
                      : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {selectedQuarters.includes(quarter) && "+ "}
                  {quarter}
                  {selectedQuarters.includes(quarter) && (
                    <span className="ml-1 text-gray-500">×</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Overview
            </div>
            <div className="space-y-4">
              <KPICard title="Active Members" value={loading ? "..." : activeMembers} />
              <KPICard title="Total Lifetime Members" value={loading ? "..." : totalLifetimeMembers} />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Overview
            </div>
            <div className="space-y-4">
              <KPICard title="Active Members" value={loading ? "..." : activeMembers} />
              <KPICard title="Inactive Members" value={loading ? "..." : inactiveMembers} />
            </div>
          </div>
        </div>

        {/* Charts Section - 2x2 Grid */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Attendance per GBM */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance per GBM</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={attendancePerGBMData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b"
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="#64748b"
                  tick={{ fill: '#64748b' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="attendance" fill="#2563eb" />
                <Line 
                  type="monotone" 
                  dataKey="attendance" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Members per Year */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Members per Year</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={membersPerYearData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="year" 
                  stroke="#64748b"
                  tick={{ fill: '#64748b' }}
                />
                <YAxis 
                  stroke="#64748b"
                  tick={{ fill: '#64748b' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" fill="#2563eb" />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Tech vs Non-Tech */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tech vs Non-Tech</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={techNonTechData}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  type="number"
                  stroke="#64748b"
                  tick={{ fill: '#64748b' }}
                />
                <YAxis 
                  type="category"
                  dataKey="category"
                  stroke="#64748b"
                  tick={{ fill: '#64748b' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#8b5cf6"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Associates vs Analysts */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Associates vs Analysts</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={associatesAnalystsData}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  type="number"
                  stroke="#64748b"
                  tick={{ fill: '#64748b' }}
                />
                <YAxis 
                  type="category"
                  dataKey="category"
                  stroke="#64748b"
                  tick={{ fill: '#64748b' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#8b5cf6"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Member Network Graph */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Member Collaboration Network</h3>
          <p className="text-sm text-gray-500 mb-4">
            Members are connected if they worked on the same project. Drag nodes to rearrange, scroll to zoom, drag background to pan.
          </p>
          <div 
            ref={graphContainerRef}
            className="h-[700px] border border-gray-200 rounded-lg overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100"
          >
            {!loading && networkData.nodes.length > 0 ? (
              <ForceGraph 
                nodes={networkData.nodes}
                links={networkData.links}
                width={graphDimensions.width}
                height={graphDimensions.height}
              />
            ) : loading ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                Loading network data...
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No collaboration data available for selected quarters
              </div>
            )}
          </div>
        </div>

        {/* Members Database Table */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Members Database</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No members found
                    </td>
                  </tr>
                ) : (
                  members.map((member) => (
                    <tr key={member.member_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.year || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.role || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.email || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          member.status 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {member.status ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
