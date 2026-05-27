import React, { useState, useEffect, useRef } from 'react';
import Konva from 'konva';
import { Stage, Layer, Rect, Circle, Line, Text, Group, RegularPolygon } from 'react-konva';
import { Member, Union, Child, UnionType, Gender, Project } from './types';
import { User, UserPlus, Trash2, Heart, Baby, Settings2, Download, Plus, Users, XCircle, Split, Link2, Undo2, RotateCcw, ZoomIn, ZoomOut, Maximize, Check, X, Pencil, MousePointer2, Eraser, FolderOpen, Save, FilePlus, Edit3, ScanLine, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { recognizeGenogramFromImage } from './services/aiService';

const MEMBER_SIZE = 60;
const GRID_SIZE = 20;

export default function App() {
  const [members, setMembers] = useState<Member[]>([]);
  const [unions, setUnions] = useState<Union[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [history, setHistory] = useState<{members: Member[], unions: Union[], children: Child[], lines: any[]}[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedUnionId, setSelectedUnionId] = useState<string | null>(null);
  const [customBirthCount, setCustomBirthCount] = useState<number>(3);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [exportWithBackground, setExportWithBackground] = useState(true);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [draftData, setDraftData] = useState<{members: Member[], unions: Union[], children: Child[], lines: any[]} | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [lines, setLines] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);

  // Initialize
  useEffect(() => {
    const savedProjects = localStorage.getItem('genogram-projects');
    const lastActiveId = localStorage.getItem('genogram-active-project-id');
    const savedDraft = localStorage.getItem('genogram-draft');
    
    let loadedProjects: Project[] = [];
    if (savedProjects) {
      try {
        loadedProjects = JSON.parse(savedProjects);
        setProjects(loadedProjects);
      } catch (e) {
        console.error('Failed to load projects', e);
      }
    }

    if (savedDraft) {
      try {
        setDraftData(JSON.parse(savedDraft));
      } catch (e) {}
    }
    
    if (lastActiveId === 'draft' || !lastActiveId) {
      switchToDraft();
    } else {
      const activeProject = loadedProjects.find(p => p.id === lastActiveId);
      if (activeProject) {
        loadProjectData(activeProject);
      } else {
        switchToDraft();
      }
    }
  }, []);

  const switchToDraft = () => {
    const savedDraft = localStorage.getItem('genogram-draft');
    if (savedDraft) {
      try {
        const data = JSON.parse(savedDraft);
        setMembers(data.members || []);
        setUnions(data.unions || []);
        setChildren(data.children || []);
        setLines(data.lines || []);
      } catch (e) {
        initDraft();
      }
    } else {
      initDraft();
    }
    setActiveProjectId(null);
    localStorage.setItem('genogram-active-project-id', 'draft');
    setHistory([]);
    setSelectedId(null);
    setSelectedUnionId(null);
  };

  const initDraft = () => {
    setMembers([{
      id: 'index-member',
      name: '',
      gender: 'male',
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      isIndex: true,
    }]);
    setUnions([]);
    setChildren([]);
    setLines([]);
  };

  const loadProjectData = (project: Project) => {
    setActiveProjectId(project.id);
    setMembers(project.data.members);
    setUnions(project.data.unions);
    setChildren(project.data.children);
    setLines(project.data.lines || []);
    setHistory([]);
    localStorage.setItem('genogram-active-project-id', project.id);
  };

  const loadProject = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    loadProjectData(project);
    setIsProjectModalOpen(false);
  };

  const createNewProject = (name: string) => {
    const defaultData = {
      members: [{
        id: 'index-member',
        name: '',
        gender: 'male' as Gender,
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        isIndex: true,
      }],
      unions: [],
      children: [],
      lines: []
    };
    
    const newProject: Project = {
      id: 'project-' + Date.now(),
      name: name || '未命名家庭',
      data: defaultData,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    loadProjectData(newProject);
    
    localStorage.setItem('genogram-projects', JSON.stringify(updatedProjects));
    setIsProjectModalOpen(false);
    setNewProjectName('');
  };

  const deleteProject = (id: string) => {
    setProjects(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem('genogram-projects', JSON.stringify(updated));
      return updated;
    });
    
    if (activeProjectId === id) {
      switchToDraft();
    }
    setProjectToDelete(null);
  };

  const renameProject = (id: string, newName: string) => {
    if (!newName || !newName.trim()) return;
    const updatedProjects = projects.map(p => 
      p.id === id ? { ...p, name: newName, updatedAt: Date.now() } : p
    );
    setProjects(updatedProjects);
    localStorage.setItem('genogram-projects', JSON.stringify(updatedProjects));
  };

  const saveCurrentToNewProject = () => {
    const name = prompt('輸入新家庭名稱', '從草稿儲存的家庭');
    if (!name) return;

    const newProject: Project = {
      id: 'project-' + Date.now(),
      name: name,
      data: { members, unions, children, lines },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    setActiveProjectId(newProject.id);
    localStorage.setItem('genogram-projects', JSON.stringify(updatedProjects));
    localStorage.setItem('genogram-active-project-id', newProject.id);
    alert('已成功儲存為新家庭！');
  };

  // Component States
  const [tool, setTool] = useState<'select' | 'pen' | 'eraser'>('select');
  const [cursorPos, setCursorPos] = useState<{ x: number, y: number } | null>(null);
  const isDrawing = useRef(false);
  const [isStrictOrthogonal, setIsStrictOrthogonal] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedPulse, setLastSavedPulse] = useState(false);

  // States for Inline Renaming & Saving to avoid window.prompt iframe restrictions
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState<string>('');
  const [isEditingContextName, setIsEditingContextName] = useState<boolean>(false);
  const [contextNameInputValue, setContextNameInputValue] = useState<string>('');
  const [isSavingDraftAsProject, setIsSavingDraftAsProject] = useState<boolean>(false);
  const [draftProjectNameInput, setDraftProjectNameInput] = useState<string>('從草稿儲存的家庭');

  // Manual save function
  const saveChanges = () => {
    if (activeProjectId && activeProjectId !== 'draft') {
      const updatedProjects = projects.map(p => {
        if (p.id === activeProjectId) {
          return {
            ...p,
            data: { members, unions, children, lines },
            updatedAt: Date.now()
          };
        }
        return p;
      });
      setProjects(updatedProjects);
      localStorage.setItem('genogram-projects', JSON.stringify(updatedProjects));
    } else {
      const draftData = { members, unions, children, lines };
      localStorage.setItem('genogram-draft', JSON.stringify(draftData));
    }
    setHasUnsavedChanges(false);
    setLastSavedPulse(true);
    setTimeout(() => setLastSavedPulse(false), 2000);
  };

  // Track changes to mark as unsaved
  useEffect(() => {
    if (members.length > 0) {
      setHasUnsavedChanges(true);
    }
  }, [members, unions, children, lines]);

  const saveToHistory = () => {
    setHistory(prev => {
      const newHistory = [...prev, { members, unions, children, lines }];
      // Keep only last 50 steps
      if (newHistory.length > 50) return newHistory.slice(1);
      return newHistory;
    });
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setMembers(lastState.members);
    setUnions(lastState.unions);
    setChildren(lastState.children);
    setLines(lastState.lines || []);
    setHistory(prev => prev.slice(0, -1));
    
    // Update project state will be handled by the useEffect sync
  };

  const handleMouseDown = (e: any) => {
    if (tool === 'select') return;
    isDrawing.current = true;
    const stage = e.target.getStage();
    const pos = stage.getRelativePointerPosition();
    
    if (tool === 'pen') {
      setLines([...lines, { tool, points: [pos.x, pos.y], color: '#4f46e5', isEraser: false }]);
    } else if (tool === 'eraser') {
      setLines([...lines, { tool, points: [pos.x, pos.y], color: '#ffffff', isEraser: true }]);
    }
  };

  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const point = stage.getRelativePointerPosition();
    
    // Update cursor position for eraser feedback
    if (tool === 'eraser') {
      setCursorPos(point);
    } else {
      setCursorPos(null);
    }

    if (!isDrawing.current || tool === 'select') return;
    
    if (tool === 'pen' || tool === 'eraser') {
      let lastLine = { ...lines[lines.length - 1] };
      // add point
      lastLine.points = lastLine.points.concat([point.x, point.y]);

      // replace last
      const newLines = [...lines];
      newLines[newLines.length - 1] = lastLine;
      setLines(newLines);
    }
  };

  const eraseAt = (pos: { x: number, y: number }) => {
    const threshold = 15;
    const newLines = lines.filter(line => {
      for (let i = 0; i < line.points.length; i += 2) {
        const dx = line.points[i] - pos.x;
        const dy = line.points[i+1] - pos.y;
        if (Math.sqrt(dx*dx + dy*dy) < threshold) return false;
      }
      return true;
    });
    if (newLines.length !== lines.length) {
      setLines(newLines);
    }
  };

  const handleMouseUp = () => {
    if (isDrawing.current) {
      saveToHistory();
    }
    isDrawing.current = false;
  };

  const clearDrawings = () => {
    saveToHistory();
    setLines([]);
  };

  const initIndexMember = () => {
    const indexMember: Member = {
      id: 'index-member',
      name: '',
      gender: 'male',
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      isIndex: true,
    };
    setMembers([indexMember]);
    setUnions([]);
    setChildren([]);
    setSelectedId(indexMember.id);
    setSelectedUnionId(null);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleAiRecognize = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAiParsing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const result = await recognizeGenogramFromImage(base64, file.type);
        
        if (result && result.members) {
          // Adjust coordinates to be relative to the center of the current view
          const viewCenter = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
          };

          // Scale from AI coordinates (0-1000) to actual canvas coordinates
          // Centering the reconocized structure
          const scaledMembers = result.members.map(m => ({
            ...m,
            x: (m.x / 1000) * 800 + (viewCenter.x - 400),
            y: (m.y / 1000) * 800 + (viewCenter.y - 400),
          }));

          setMembers(scaledMembers);
          setUnions(result.unions || []);
          setChildren(result.children || []);
          setLines([]); // Reset free lines
          
          alert('AI 辨識完成！已自動載入家系圖結構。您現在可以繼續編輯。');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('AI Recognition failed:', error);
      alert('AI 辨識失敗，請稍後再試或換一張圖片。');
    } finally {
      setIsAiParsing(false);
      if (e.target) e.target.value = ''; // Reset input
    }
  };

  const handleWheel = (e: any) => {
    if (isDrawing.current) return; // Disable zoom while actively drawing
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const speed = 1.1;
    const newScale = e.evt.deltaY > 0 ? oldScale / speed : oldScale * speed;

    const limitedScale = Math.max(0.1, Math.min(5, newScale));
    
    setScale(limitedScale);
    setPosition({
      x: pointer.x - mousePointTo.x * limitedScale,
      y: pointer.y - mousePointTo.y * limitedScale,
    });
  };

  const centerView = () => {
    if (members.length === 0) return;

    const minX = Math.min(...members.map(m => m.x));
    const maxX = Math.max(...members.map(m => m.x));
    const minY = Math.min(...members.map(m => m.y));
    const maxY = Math.max(...members.map(m => m.y));

    const contentWidth = maxX - minX + 200;
    const contentHeight = maxY - minY + 200;
    
    const scaleX = dimensions.width / contentWidth;
    const scaleY = dimensions.height / contentHeight;
    const newScale = Math.min(scaleX, scaleY, 1);

    setScale(newScale);
    setPosition({
      x: (dimensions.width - (maxX + minX) * newScale) / 2,
      y: (dimensions.height - (maxY + minY) * newScale) / 2,
    });
  };

  useEffect(() => {
    // Current state is synced to projects in the other useEffect
  }, [members, unions, children]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const addPartner = (fromId: string) => {
    const fromMember = members.find(m => m.id === fromId);
    if (!fromMember) return;

    // Check how many partners this member already has to offset the new one
    const existingUnions = unions.filter(u => u.partnerAId === fromId || u.partnerBId === fromId);
    const offset = (existingUnions.length + 1) * 150;

    const newPartner: Member = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      gender: fromMember.gender === 'male' ? 'female' : 'male',
      x: fromMember.x + offset,
      y: fromMember.y,
    };

    const newUnion: Union = {
      id: Math.random().toString(36).substr(2, 9),
      partnerAId: fromId,
      partnerBId: newPartner.id,
      type: 'marriage',
    };

    saveToHistory();
    setMembers([...members, newPartner]);
    setUnions([...unions, newUnion]);
    setSelectedId(newPartner.id);
  };

  const addParents = (childId: string) => {
    const child = members.find(m => m.id === childId);
    if (!child) return;

    // Check if already has parents
    const alreadyHasParents = children.some(c => c.memberId === childId);
    if (alreadyHasParents) return;

    const father: Member = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      gender: 'male',
      x: child.x - 75,
      y: child.y - 150,
    };

    const mother: Member = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      gender: 'female',
      x: child.x + 75,
      y: child.y - 150,
    };

    const newUnion: Union = {
      id: Math.random().toString(36).substr(2, 9),
      partnerAId: father.id,
      partnerBId: mother.id,
      type: 'marriage',
    };

    const newChildRel: Child = {
      id: Math.random().toString(36).substr(2, 9),
      unionId: newUnion.id,
      memberId: childId,
    };

    saveToHistory();
    setMembers([...members, father, mother]);
    setUnions([...unions, newUnion]);
    setChildren([...children, newChildRel]);
  };

  const addMultipleChildren = (unionId: string, count: number, isMultipleBirth: boolean) => {
    const union = unions.find(u => u.id === unionId);
    if (!union) return;

    const p1 = members.find(m => m.id === union.partnerAId);
    const p2 = members.find(m => m.id === union.partnerBId);
    if (!p1 || !p2) return;

    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    const existingSiblingRels = children.filter(c => c.unionId === unionId);
    let targetY = midY + 150;
    if (existingSiblingRels.length > 0) {
      const firstSibling = members.find(m => m.id === existingSiblingRels[0].memberId);
      if (firstSibling) targetY = firstSibling.y;
    }

    const groupId = isMultipleBirth ? Math.random().toString(36).substr(2, 9) : undefined;
    const newMembers: Member[] = [];
    const newRels: Child[] = [];

    // Calculate starting X to center the new group
    const spacing = 80;
    const groupWidth = (count - 1) * spacing;
    const startX = midX - groupWidth / 2 + (existingSiblingRels.length > 0 ? 150 : 0);

    for (let i = 0; i < count; i++) {
      const member: Member = {
        id: Math.random().toString(36).substr(2, 9),
        name: '',
        gender: 'male',
        x: startX + i * spacing,
        y: targetY,
      };
      const rel: Child = {
        id: Math.random().toString(36).substr(2, 9),
        unionId,
        memberId: member.id,
        multipleBirthId: groupId,
      };
      newMembers.push(member);
      newRels.push(rel);
    }

    saveToHistory();
    setMembers([...members, ...newMembers]);
    setChildren([...children, ...newRels]);
    if (newMembers.length > 0) setSelectedId(newMembers[0].id);
  };

  const addSibling = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    // Find the union where this member is a child
    const childRel = children.find(c => c.memberId === memberId);
    
    if (childRel) {
      // If member already has parents, add a child to that union
      addMultipleChildren(childRel.unionId, 1, false);
    } else {
      // If member doesn't have parents, create parents first, then add a sibling
      const father: Member = {
        id: Math.random().toString(36).substr(2, 9),
        name: '',
        gender: 'male',
        x: member.x - 75,
        y: member.y - 150,
      };

      const mother: Member = {
        id: Math.random().toString(36).substr(2, 9),
        name: '',
        gender: 'female',
        x: member.x + 75,
        y: member.y - 150,
      };

      const newUnion: Union = {
        id: Math.random().toString(36).substr(2, 9),
        partnerAId: father.id,
        partnerBId: mother.id,
        type: 'marriage',
      };

      const originalChildRel: Child = {
        id: Math.random().toString(36).substr(2, 9),
        unionId: newUnion.id,
        memberId: memberId,
      };

      const sibling: Member = {
        id: Math.random().toString(36).substr(2, 9),
        name: '',
        gender: 'male',
        x: member.x + 150,
        y: member.y,
      };

      const siblingRel: Child = {
        id: Math.random().toString(36).substr(2, 9),
        unionId: newUnion.id,
        memberId: sibling.id,
      };

      saveToHistory();
      setMembers([...members, father, mother, sibling]);
      setUnions([...unions, newUnion]);
      setChildren([...children, originalChildRel, siblingRel]);
      setSelectedId(sibling.id);
    }
  };

  const deleteMember = (id: string) => {
    saveToHistory();
    setMembers(prevMembers => {
      const filteredMembers = prevMembers.filter(m => m.id !== id);
      const remainingUnions = unions.filter(u => u.partnerAId !== id && u.partnerBId !== id);
      const remainingChildren = children.filter(c => c.memberId !== id);
      
      const finalMembers = [...filteredMembers];
      remainingUnions.forEach(u => {
        const unionChildren = remainingChildren.filter(c => c.unionId === u.id);
        if (unionChildren.length === 1) {
          const childId = unionChildren[0].memberId;
          const childIdx = finalMembers.findIndex(m => m.id === childId);
          if (childIdx !== -1) {
            const p1 = finalMembers.find(m => m.id === u.partnerAId);
            const p2 = finalMembers.find(m => m.id === u.partnerBId);
            if (p1 && p2) {
              finalMembers[childIdx] = { ...finalMembers[childIdx], x: (p1.x + p2.x) / 2 };
            }
          }
        }
      });
      return finalMembers;
    });
    setUnions(unions.filter(u => u.partnerAId !== id && u.partnerBId !== id));
    setChildren(children.filter(c => c.memberId !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const deleteUnion = (id: string) => {
    saveToHistory();
    setUnions(unions.filter(u => u.id !== id));
    setChildren(children.filter(c => c.unionId !== id));
    if (selectedUnionId === id) setSelectedUnionId(null);
  };

  const updateMember = (updates: Partial<Member>) => {
    if (!selectedId) return;
    saveToHistory();
    setMembers(members.map(m => {
      if (m.id === selectedId) {
        return { ...m, ...updates };
      }
      return m;
    }));
  };

  const updateUnion = (unionId: string, type: UnionType) => {
    saveToHistory();
    setUnions(unions.map(u => u.id === unionId ? { ...u, type } : u));
  };

  const handleDragEnd = (id: string, e: any) => {
    const newX = e.target.x();
    const newY = e.target.y();
    
    const member = members.find(m => m.id === id);
    if (!member) return;

    const dx = newX - member.x;
    const dy = newY - member.y;

    saveToHistory();
    setMembers(prevMembers => {
      let updatedMembers = [...prevMembers];
      
      // Move individual member (with Y-sync for same generation)
      const memberIndex = updatedMembers.findIndex(m => m.id === id);
      if (memberIndex === -1) return prevMembers;

      updatedMembers[memberIndex] = { ...updatedMembers[memberIndex], x: newX, y: newY };

      // Snap to parent's X if close
      const childRel = children.find(c => c.memberId === id);
      if (childRel) {
        const union = unions.find(u => u.id === childRel.unionId);
        if (union) {
          const p1 = updatedMembers.find(m => m.id === union.partnerAId);
          const p2 = updatedMembers.find(m => m.id === union.partnerBId);
          if (p1 && p2) {
            const parentMidX = (p1.x + p2.x) / 2;
            if (Math.abs(newX - parentMidX) < 20) {
              updatedMembers[memberIndex] = { ...updatedMembers[memberIndex], x: parentMidX, y: newY };
            }
          }
        }
      }

      // Find parallel members (spouses and siblings) to keep Y level consistent
      const parallelIds = new Set<string>();
      const q = [id];
      const visited = new Set<string>();
      
      while(q.length > 0) {
        const currentId = q.shift()!;
        if (visited.has(currentId)) continue;
        visited.add(currentId);
        
        unions.forEach(u => {
          if (u.partnerAId === currentId) {
            parallelIds.add(u.partnerBId);
            q.push(u.partnerBId);
          } else if (u.partnerBId === currentId) {
            parallelIds.add(u.partnerAId);
            q.push(u.partnerAId);
          }
        });

        const cRel = children.find(c => c.memberId === currentId);
        if (cRel) {
          const siblings = children.filter(c => c.unionId === cRel.unionId);
          siblings.forEach(s => {
            parallelIds.add(s.memberId);
            q.push(s.memberId);
          });
        }
      }
      parallelIds.delete(id);

      updatedMembers = updatedMembers.map(m => {
        if (parallelIds.has(m.id)) {
          return { ...m, y: newY };
        }
        return m;
      });

      // Strict Orthogonal Enforcement: Force parents and children to align vertically
      if (isStrictOrthogonal) {
        // We need to iterate and fix alignments
        // This is a simplified enforcement: find unions and their children, then center them
        unions.forEach(union => {
          const unionChildren = children.filter(c => c.unionId === union.id);
          if (unionChildren.length === 0) return;

          const p1Idx = updatedMembers.findIndex(m => m.id === union.partnerAId);
          const p2Idx = updatedMembers.findIndex(m => m.id === union.partnerBId);
          if (p1Idx === -1 || p2Idx === -1) return;

          const childMembers = unionChildren
            .map(c => updatedMembers.find(m => m.id === c.memberId))
            .filter((m): m is Member => !!m);
          
          if (childMembers.length === 0) return;

          const parentMidX = (updatedMembers[p1Idx].x + updatedMembers[p2Idx].x) / 2;
          const childrenXSum = childMembers.reduce((sum, m) => sum + m.x, 0);
          const childrenMidX = childrenXSum / childMembers.length;

          const diff = parentMidX - childrenMidX;

          if (Math.abs(diff) > 0.1) {
            // If we are dragging a child (or one of its descendants), move parents to align
            // To make it feel "strict", we move the parents' entire vertical chain
            const isDraggingChild = unionChildren.some(c => c.memberId === id);
            
            // Check if the dragged item is a descendant of any child in this union
            const isDescendant = (startId: string, targetUnionId: string): boolean => {
              const rel = children.find(c => c.memberId === startId);
              if (!rel) return false;
              if (rel.unionId === targetUnionId) return true;
              const u = unions.find(un => un.id === rel.unionId);
              if (!u) return false;
              return isDescendant(u.partnerAId, targetUnionId) || isDescendant(u.partnerBId, targetUnionId);
            };

            if (isDraggingChild || isDescendant(id, union.id)) {
              const moveX = -diff;
              // Move parents and their ancestors
              const toMove = new Set<string>();
              const q = [union.partnerAId, union.partnerBId];
              while(q.length > 0) {
                const curr = q.shift()!;
                if (toMove.has(curr)) continue;
                toMove.add(curr);
                const cRel = children.find(c => c.memberId === curr);
                if (cRel) {
                  const u = unions.find(un => un.id === cRel.unionId);
                  if (u) {
                    q.push(u.partnerAId);
                    q.push(u.partnerBId);
                  }
                }
              }
              updatedMembers = updatedMembers.map(m => {
                if (toMove.has(m.id)) return { ...m, x: m.x + moveX };
                return m;
              });
            } else {
              // If we are dragging a parent, move children to align
              const moveX = diff;
              // Move all children and their descendants
              const toMove = new Set<string>();
              const q = unionChildren.map(c => c.memberId);
              while(q.length > 0) {
                const curr = q.shift()!;
                if (toMove.has(curr)) continue;
                toMove.add(curr);
                unions.forEach(u => {
                  if (u.partnerAId === curr || u.partnerBId === curr) {
                    children.forEach(c => {
                      if (c.unionId === u.id) q.push(c.memberId);
                    });
                  }
                });
              }
              updatedMembers = updatedMembers.map(m => {
                if (toMove.has(m.id)) return { ...m, x: m.x + moveX };
                return m;
              });
            }
          }
        });
      }

      return updatedMembers;
    });
  };

  const exportImage = () => {
    if (stageRef.current) {
      const stage = stageRef.current;
      const layers = stage.getLayers();
      const primaryLayer = layers[0];
      
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      let layerMinX = Infinity;
      let layerMinY = Infinity;
      let layerMaxX = -Infinity;
      let layerMaxY = -Infinity;

      layers.forEach((lyr) => {
        if (lyr.getChildren().length > 0) {
          try {
            const b = lyr.getClientRect();
            if (b.width > 0 && b.height > 0) {
              minX = Math.min(minX, b.x);
              minY = Math.min(minY, b.y);
              maxX = Math.max(maxX, b.x + b.width);
              maxY = Math.max(maxY, b.y + b.height);
            }

            const lb = lyr.getClientRect({ relativeTo: primaryLayer });
            if (lb.width > 0 && lb.height > 0) {
              layerMinX = Math.min(layerMinX, lb.x);
              layerMinY = Math.min(layerMinY, lb.y);
              layerMaxX = Math.max(layerMaxX, lb.x + lb.width);
              layerMaxY = Math.max(layerMaxY, lb.y + lb.height);
            }
          } catch (e) {
            console.warn("Failed to get client rect for layer:", e);
          }
        }
      });

      let box = { x: 0, y: 0, width: 0, height: 0 };
      let layerBox = { x: 0, y: 0, width: 0, height: 0 };

      if (minX !== Infinity && minY !== Infinity && maxX !== -Infinity && maxY !== -Infinity) {
        box = {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY
        };
      } else {
        box = primaryLayer.getClientRect();
      }

      if (layerMinX !== Infinity && layerMinY !== Infinity && layerMaxX !== -Infinity && layerMaxY !== -Infinity) {
        layerBox = {
          x: layerMinX,
          y: layerMinY,
          width: layerMaxX - layerMinX,
          height: layerMaxY - layerMinY
        };
      } else {
        layerBox = primaryLayer.getClientRect({ relativeTo: primaryLayer });
      }

      let bg: any = null;
      if (exportWithBackground) {
        bg = new Konva.Rect({
          x: layerBox.x - 50,
          y: layerBox.y - 50,
          width: layerBox.width + 100,
          height: layerBox.height + 100,
          fill: 'white',
          listening: false,
        });
        primaryLayer.add(bg);
        bg.moveToBottom();
      }

      const uri = stage.toDataURL({
        x: box.x - 50,
        y: box.y - 50,
        width: box.width + 100,
        height: box.height + 100,
        pixelRatio: 2,
      });

      if (bg) {
        bg.destroy();
      }

      const link = document.createElement('a');
      link.download = 'genogram.png';
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const newFile = () => {
    // Determine center coordinates
    const centerX = (dimensions.width > 0 ? dimensions.width : window.innerWidth) / 2;
    const centerY = (dimensions.height > 0 ? dimensions.height : window.innerHeight) / 2;

    const resetData = {
      members: [{
        id: 'index-member',
        name: '',
        gender: 'male' as Gender,
        x: centerX,
        y: centerY,
        isIndex: true,
      }],
      unions: [],
      children: [],
      lines: []
    };

    // Update current working state
    setMembers(resetData.members);
    setUnions(resetData.unions);
    setChildren(resetData.children);
    setLines(resetData.lines);
    setHistory([]);
    setSelectedId('index-member');
    setSelectedUnionId(null);
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setShowConfirmReset(false);

    // Also immediately push to project list and storage to be absolutely sure
    if (activeProjectId) {
      setProjects(prevProjects => {
        const updatedProjects = prevProjects.map(p => {
          if (p.id === activeProjectId) {
            return {
              ...p,
              data: resetData,
              updatedAt: Date.now()
            };
          }
          return p;
        });
        localStorage.setItem('genogram-projects', JSON.stringify(updatedProjects));
        return updatedProjects;
      });
    }
  };

  const selectedMember = members.find(m => m.id === selectedId);
  const selectedUnion = unions.find(u => u.id === selectedUnionId);

  return (
    <>
      <div className="flex h-screen w-screen bg-zinc-50 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-zinc-200 flex flex-col shadow-sm z-10">
        
        {/* Compact Header & Mode Selector */}
        <div className="bg-white border-b border-zinc-100 flex flex-col pt-4 pb-2 px-4 gap-3">
          <div className="flex items-center gap-2 pb-1">
            <Settings2 className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-bold tracking-tight text-zinc-900">家系圖繪製</span>
          </div>

          <div className="flex p-0.5 bg-zinc-100 rounded-lg">
            <button 
              onClick={switchToDraft}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-bold transition-all ${!activeProjectId ? 'bg-white text-indigo-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              <Pencil className="w-3 h-3" />
              隨手記
            </button>
            <button 
              onClick={() => setIsProjectModalOpen(true)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-bold transition-all ${activeProjectId ? 'bg-white text-indigo-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              <FolderOpen className="w-3 h-3" />
              案家管理中心
            </button>
          </div>
        </div>

        {/* Compact Context Bar */}
        <div className="px-4 py-2 border-b border-zinc-100 bg-zinc-50/30 flex items-center justify-between min-h-[44px]">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={`p-1 rounded ${activeProjectId ? 'bg-indigo-100 text-indigo-600' : 'bg-zinc-200 text-zinc-500'}`}>
              {activeProjectId ? <FolderOpen className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
            </div>
            {isEditingContextName ? (
              <div className="flex items-center gap-1 flex-1">
                <input 
                  type="text"
                  value={contextNameInputValue}
                  onChange={(e) => setContextNameInputValue(e.target.value)}
                  className="px-2 py-0.5 max-w-[140px] bg-white border border-indigo-200 rounded text-[11px] focus:ring-1 focus:ring-indigo-500 outline-none font-bold text-zinc-900"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const trimmed = contextNameInputValue.trim();
                      if (trimmed && activeProjectId) {
                        renameProject(activeProjectId, trimmed);
                        setIsEditingContextName(false);
                      }
                    } else if (e.key === 'Escape') {
                      setIsEditingContextName(false);
                    }
                  }}
                  autoFocus
                />
                <button 
                  onClick={() => {
                    const trimmed = contextNameInputValue.trim();
                    if (trimmed && activeProjectId) {
                      renameProject(activeProjectId, trimmed);
                      setIsEditingContextName(false);
                    }
                  }}
                  className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => setIsEditingContextName(false)}
                  className="p-0.5 text-zinc-400 hover:bg-zinc-100 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span className={`text-[11px] font-bold truncate ${activeProjectId ? 'text-indigo-900' : 'text-zinc-600'}`}>
                {activeProjectId ? (projects.find(p => p.id === activeProjectId)?.name || '未命名家庭') : '正在使用草稿'}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            {!activeProjectId ? (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setDraftProjectNameInput('從草稿儲存的家庭');
                  setIsSavingDraftAsProject(true);
                  setIsProjectModalOpen(true);
                }}
                className="text-indigo-600 hover:text-indigo-700 text-[10px] font-bold flex items-center gap-1 bg-white border border-indigo-100 px-2 py-1 rounded shadow-sm hover:shadow"
                title="儲存草稿為正式家系圖"
              >
                <Save className="w-2.5 h-2.5" />
                儲存
              </button>
            ) : (
              !isEditingContextName && (
                <button 
                   onClick={() => {
                     const currentProject = projects.find(p => p.id === activeProjectId);
                     if (currentProject) {
                       setContextNameInputValue(currentProject.name);
                       setIsEditingContextName(true);
                     }
                   }}
                   className="p-1 text-zinc-400 hover:text-indigo-600 hover:bg-white rounded transition-all"
                   title="重新命名"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              )
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {members.length === 0 && (
            <motion.section 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 text-center">
                <Users className="w-12 h-12 text-indigo-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-indigo-900 mb-1">畫布目前是空的</h3>
                <p className="text-[11px] text-indigo-600 mb-4">請新增第一個成員（案主）來開始繪製家系圖</p>
                <button 
                  onClick={initIndexMember}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  新增案主
                </button>
              </div>
            </motion.section>
          )}

          {selectedMember && (
            <motion.section 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-2">編輯成員</h2>
              <div className="space-y-3 px-2">
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={selectedMember.isIndex || false}
                      onChange={(e) => updateMember({ isIndex: e.target.checked })}
                      className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-[11px] font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors">設為案主</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={selectedMember.isDeceased || false}
                      onChange={(e) => updateMember({ isDeceased: e.target.checked })}
                      className="w-4 h-4 rounded border-zinc-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-[11px] font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors">死亡</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={selectedMember.hasDisability || false}
                      onChange={(e) => updateMember({ hasDisability: e.target.checked })}
                      className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-[11px] font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors">身障</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={selectedMember.hasChronicDisease || false}
                      onChange={(e) => updateMember({ hasChronicDisease: e.target.checked })}
                      className="w-4 h-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-[11px] font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors">慢性病</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">姓名</label>
                    <input 
                      type="text" 
                      value={selectedMember.name}
                      onChange={(e) => updateMember({ name: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">年齡</label>
                    <input 
                      type="text" 
                      value={selectedMember.age || ''}
                      onChange={(e) => updateMember({ age: e.target.value })}
                      placeholder="例: 45"
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">備註</label>
                  <textarea 
                    value={selectedMember.note || ''}
                    onChange={(e) => updateMember({ note: e.target.value })}
                    placeholder="填寫備註資訊..."
                    rows={2}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">性別</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => updateMember({ gender: 'male' })}
                      className={`py-2 rounded-lg text-xs font-medium border transition-all ${selectedMember.gender === 'male' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}
                    >
                      男性
                    </button>
                    <button 
                      onClick={() => updateMember({ gender: 'female' })}
                      className={`py-2 rounded-lg text-xs font-medium border transition-all ${selectedMember.gender === 'female' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}
                    >
                      女性
                    </button>
                    <button 
                      onClick={() => updateMember({ gender: 'unknown' })}
                      className={`py-2 rounded-lg text-[10px] font-medium border transition-all ${selectedMember.gender === 'unknown' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}
                    >
                      懷孕/未知
                    </button>
                  </div>
                </div>
                <div className="pt-2 space-y-2">
                  <button 
                    onClick={() => addPartner(selectedMember.id)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    新增關係 (配偶/伴侶)
                  </button>

                  <button 
                    onClick={() => addSibling(selectedMember.id)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    新增關係 (手足)
                  </button>
                  
                  {!children.some(c => c.memberId === selectedMember.id) && (
                    <button 
                      onClick={() => addParents(selectedMember.id)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-800 text-white rounded-xl text-sm font-medium hover:bg-zinc-900 transition-all shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      新增關係 (父母)
                    </button>
                  )}
                </div>
                <button 
                  onClick={() => deleteMember(selectedMember.id)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-rose-600 text-xs font-medium hover:bg-rose-50 rounded-lg transition-colors mt-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  刪除成員
                </button>
              </div>
            </motion.section>
          )}

          {selectedUnion && (
            <motion.section 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 pt-4 border-t border-zinc-100"
            >
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-2">編輯關係</h2>
              <div className="space-y-2 px-2">
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => updateUnion(selectedUnion.id, 'marriage')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium border transition-all ${selectedUnion.type === 'marriage' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-zinc-200'}`}
                  >
                    <Link2 className="w-3 h-3" /> 結婚
                  </button>
                  <button 
                    onClick={() => updateUnion(selectedUnion.id, 'cohabitation')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium border transition-all ${selectedUnion.type === 'cohabitation' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-zinc-200'}`}
                  >
                    <Users className="w-3 h-3" /> 同居
                  </button>
                  <button 
                    onClick={() => updateUnion(selectedUnion.id, 'separation')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium border transition-all ${selectedUnion.type === 'separation' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-zinc-200'}`}
                  >
                    <Split className="w-3 h-3" /> 分居
                  </button>
                  <button 
                    onClick={() => updateUnion(selectedUnion.id, 'divorce')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium border transition-all ${selectedUnion.type === 'divorce' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-zinc-200'}`}
                  >
                    <XCircle className="w-3 h-3" /> 離婚
                  </button>
                </div>
                <div className="pt-2 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => addMultipleChildren(selectedUnion.id, 1, false)}
                      className="flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all shadow-sm"
                    >
                      <Baby className="w-4 h-4" />
                      新增子女
                    </button>
                    <button 
                      onClick={() => addMultipleChildren(selectedUnion.id, 2, true)}
                      className="flex items-center justify-center gap-2 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-all shadow-sm"
                    >
                      <Users className="w-4 h-4" />
                      新增雙胞胎
                    </button>
                  </div>
                  
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-2">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">新增多胞胎 (三胞胎以上)</p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input 
                          type="number" 
                          min="3"
                          max="10"
                          value={customBirthCount}
                          onChange={(e) => setCustomBirthCount(parseInt(e.target.value) || 3)}
                          className="w-full pl-3 pr-10 py-2 bg-white border border-zinc-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 font-medium">胞胎</span>
                      </div>
                      <button 
                        onClick={() => addMultipleChildren(selectedUnion.id, customBirthCount, true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        新增
                      </button>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => deleteUnion(selectedUnion.id)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-rose-600 text-xs font-medium hover:bg-rose-50 rounded-lg transition-colors mt-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  刪除此關係
                </button>
              </div>
            </motion.section>
          )}
        </div>

        <div className="p-4 border-t border-zinc-100 bg-zinc-50/50 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={handleUndo}
              disabled={history.length === 0}
              className={`flex items-center justify-center gap-2 py-2 bg-white border rounded-lg text-xs font-medium transition-all ${history.length === 0 ? 'border-zinc-100 text-zinc-300 cursor-not-allowed' : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}
            >
              <Undo2 className="w-3.5 h-3.5" />
              上一步
            </button>
            <button 
              onClick={centerView}
              className="flex items-center justify-center gap-2 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg text-xs font-medium hover:bg-zinc-50 transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5" />
              置中呈現
            </button>
          </div>
          {!showConfirmReset ? (
            <button 
              onClick={() => setShowConfirmReset(true)}
              className="w-full flex items-center justify-center gap-2 py-2 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-100 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              重新開始
            </button>
          ) : (
            <div className="flex gap-2">
              <button 
                onClick={newFile}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-all shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                確認清空
              </button>
              <button 
                onClick={() => setShowConfirmReset(false)}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-zinc-100 text-zinc-600 rounded-lg text-xs font-medium hover:bg-zinc-200 transition-all"
              >
                <X className="w-3.5 h-3.5" />
                取消
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 px-2 py-1">
            <input 
              type="checkbox" 
              id="export-bg"
              checked={exportWithBackground}
              onChange={(e) => setExportWithBackground(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
            />
            <label htmlFor="export-bg" className="text-[11px] font-medium text-zinc-500 cursor-pointer">匯出時保留白底</label>
          </div>
          <button 
            onClick={exportImage}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            匯出圖片
          </button>
        </div>
      </div>

        {/* Main Canvas Area */}
        <div ref={containerRef} className="flex-1 relative canvas-container overflow-hidden">
          {/* Tool Switcher */}
          <div className="absolute top-6 left-6 z-10 flex gap-2">
            <div className="relative">
              <input 
                type="file" 
                id="ai-image-upload" 
                className="hidden" 
                accept="image/*"
                onChange={handleAiRecognize}
                disabled={isAiParsing}
              />
              <label 
                htmlFor="ai-image-upload"
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all shadow-lg font-medium border cursor-pointer ${
                  isAiParsing 
                    ? 'bg-zinc-50 text-zinc-400 border-zinc-200' 
                    : 'bg-white text-indigo-600 border-zinc-200 hover:bg-zinc-50 hover:border-indigo-100 hover:shadow-indigo-50'
                }`}
                title="AI 圖片辨識掃描"
              >
                {isAiParsing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ScanLine className="w-4 h-4" />
                )}
                <span className="text-xs">{isAiParsing ? '辨識中...' : 'AI 辨識'}</span>
              </label>
            </div>

            <button
              onClick={() => setTool('select')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all shadow-lg font-medium border ${
                tool === 'select' 
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-100' 
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
              }`}
              title="選取與移動"
            >
              <MousePointer2 className="w-4 h-4" />
              <span className="text-xs">選取模式</span>
            </button>
            <button
              onClick={() => setTool('pen')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all shadow-lg font-medium border ${
                tool === 'pen' 
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-100' 
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
              }`}
              title="畫筆模式 (圈選同住家人)"
            >
              <Pencil className="w-4 h-4" />
              <span className="text-xs">畫筆模式</span>
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all shadow-lg font-medium border ${
                tool === 'eraser' 
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-100' 
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
              }`}
              title="橡皮擦模式 (僅擦除手繪線條)"
            >
              <Eraser className="w-4 h-4" />
              <span className="text-xs">橡皮擦</span>
            </button>
            {lines.length > 0 && (
              <button
                onClick={clearDrawings}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-rose-600 border border-zinc-200 hover:bg-rose-50 transition-all shadow-lg font-medium"
                title="清除所有繪圖"
              >
                <XCircle className="w-4 h-4" />
                <span className="text-xs">全部清除</span>
              </button>
            )}
          </div>

          {/* Action Toolbar - Right */}
          <div className="absolute top-6 right-6 z-10 flex flex-col items-end gap-2">
            {!activeProjectId ? (
              <button 
                onClick={saveChanges}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white text-zinc-600 rounded-xl font-bold text-xs border border-zinc-200 hover:bg-zinc-50 hover:text-zinc-800 transition-all shadow-lg"
                title="手動將此草稿儲存至本機暫存"
              >
                <Pencil className="w-3.5 h-3.5 text-zinc-400" />
                {lastSavedPulse ? "草稿已存" : "儲存草稿"}
              </button>
            ) : (
              <button 
                onClick={saveChanges}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg border ${
                  hasUnsavedChanges 
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-100 hover:bg-indigo-700' 
                  : 'bg-white text-emerald-600 border-zinc-200 shadow-sm'
                }`}
              >
                {lastSavedPulse ? (
                  <>
                    <Check className="w-4 h-4" />
                    已儲存
                  </>
                ) : (
                  <>
                    <Save className={`w-4 h-4 ${hasUnsavedChanges ? 'animate-pulse' : ''}`} />
                    {hasUnsavedChanges ? '儲存當前變更' : '資料已儲存'}
                  </>
                )}
              </button>
            )}
            {hasUnsavedChanges && activeProjectId && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-amber-600 font-bold uppercase tracking-tight">尚未儲存變更</span>
              </motion.div>
            )}
          </div>

          {/* Zoom Controls */}
        <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2">
          <button 
            onClick={() => {
              const newScale = Math.min(5, scale * 1.2);
              setScale(newScale);
            }}
            className="p-3 bg-white border border-zinc-200 rounded-xl shadow-lg text-zinc-600 hover:text-indigo-600 hover:border-indigo-100 transition-all"
            title="放大"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              const newScale = Math.max(0.1, scale / 1.2);
              setScale(newScale);
            }}
            className="p-3 bg-white border border-zinc-200 rounded-xl shadow-lg text-zinc-600 hover:text-indigo-600 hover:border-indigo-100 transition-all"
            title="縮小"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button 
            onClick={centerView}
            className="p-3 bg-white border border-zinc-200 rounded-xl shadow-lg text-zinc-600 hover:text-indigo-600 hover:border-indigo-100 transition-all"
            title="置中呈現"
          >
            <Maximize className="w-5 h-5" />
          </button>
        </div>

        {members.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center opacity-20">
              <Users className="w-24 h-24 mx-auto mb-4" />
              <p className="text-xl font-bold">請從側邊欄新增案主</p>
            </div>
          </div>
        )}
        <Stage 
          width={dimensions.width} 
          height={dimensions.height}
          ref={stageRef}
          draggable={tool === 'select'}
          scaleX={scale}
          scaleY={scale}
          x={position.x}
          y={position.y}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setCursorPos(null)}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
        >
          <Layer listening={tool === 'select'}>
            {/* Unions (Lines) */}
            {unions.map(union => {
              const p1 = members.find(m => m.id === union.partnerAId);
              const p2 = members.find(m => m.id === union.partnerBId);
              if (!p1 || !p2) return null;

              const midX = (p1.x + p2.x) / 2;
              const midY = (p1.y + p2.y) / 2;

              return (
                <Group key={union.id}>
                  {/* Hit Area - Wider invisible line for easier clicking */}
                  <Line
                    points={[p1.x, p1.y, p2.x, p2.y]}
                    stroke="transparent"
                    strokeWidth={20}
                    onClick={() => {
                      setSelectedUnionId(union.id);
                      setSelectedId(null);
                    }}
                    onTap={() => {
                      setSelectedUnionId(union.id);
                      setSelectedId(null);
                    }}
                  />
                  <Line
                    points={[p1.x, p1.y, p2.x, p2.y]}
                    stroke={selectedUnionId === union.id ? '#4f46e5' : '#71717a'}
                    strokeWidth={selectedUnionId === union.id ? 4 : 2}
                    dash={union.type === 'cohabitation' ? [5, 5] : []}
                    listening={false} // Let the hit area handle events
                  />
                  {/* Divorce / Separation markers */}
                  {(union.type === 'divorce' || union.type === 'separation') && (
                    <Line
                      points={[midX - 10, midY - 10, midX + 10, midY + 10]}
                      stroke={selectedUnionId === union.id ? '#4f46e5' : '#71717a'}
                      strokeWidth={2}
                      listening={false}
                    />
                  )}
                  {union.type === 'divorce' && (
                    <Line
                      points={[midX - 5, midY - 10, midX + 15, midY + 10]}
                      stroke={selectedUnionId === union.id ? '#4f46e5' : '#71717a'}
                      strokeWidth={2}
                      listening={false}
                    />
                  )}
                </Group>
              );
            })}

            {/* Children (Lines) */}
            {unions.map(union => {
              const unionChildren = children.filter(c => c.unionId === union.id);
              if (unionChildren.length === 0) return null;

              const p1 = members.find(m => m.id === union.partnerAId);
              const p2 = members.find(m => m.id === union.partnerBId);
              if (!p1 || !p2) return null;

              const parentMidX = (p1.x + p2.x) / 2;
              const parentMidY = (p1.y + p2.y) / 2;
              
              const childMembers = unionChildren
                .map(c => members.find(m => m.id === c.memberId))
                .filter((m): m is Member => !!m);

              if (childMembers.length === 0) return null;

              // Standard Sibling Bar Logic
              const barY = childMembers[0].y - 80;

              // Group children by multipleBirthId (for twins/triplets)
              const groups: Record<string, Member[]> = {};
              const singles: Member[] = [];

              unionChildren.forEach(rel => {
                const member = members.find(m => m.id === rel.memberId);
                if (!member) return;
                if (rel.multipleBirthId) {
                  if (!groups[rel.multipleBirthId]) groups[rel.multipleBirthId] = [];
                  groups[rel.multipleBirthId].push(member);
                } else {
                  singles.push(member);
                }
              });

              const groupList = Object.entries(groups);
              
              // Calculate the span of the horizontal bar
              // For twins/triplets, we use the meeting point, not the individual member positions
              const barPoints: number[] = [parentMidX];
              singles.forEach(m => barPoints.push(m.x));
              groupList.forEach(([_, groupMembers]) => {
                const meetingX = (groupMembers.reduce((sum, m) => sum + m.x, 0) / groupMembers.length);
                barPoints.push(meetingX);
              });

              const barMinX = Math.min(...barPoints);
              const barMaxX = Math.max(...barPoints);

              return (
                <Group key={`children-group-${union.id}`}>
                  {/* 1. Vertical line from parents midpoint down to the bar level */}
                  <Line
                    points={[parentMidX, parentMidY, parentMidX, barY]}
                    stroke="#71717a"
                    strokeWidth={2}
                  />
                  
                  {/* 2. Horizontal sibling bar */}
                  <Line
                    points={[barMinX, barY, barMaxX, barY]}
                    stroke="#71717a"
                    strokeWidth={2}
                  />
                  
                  {/* 3. Vertical lines down to single children */}
                  {singles.map(child => (
                    <Line
                      key={`to-child-${child.id}`}
                      points={[child.x, barY, child.x, child.y]}
                      stroke="#71717a"
                      strokeWidth={2}
                    />
                  ))}

                  {/* 4. Multiple Birth Groups (Twins/Triplets) - Diagonal lines from bar to children */}
                  {groupList.map(([groupId, groupMembers]) => {
                    const meetingX = (groupMembers.reduce((sum, m) => sum + m.x, 0) / groupMembers.length);
                    return (
                      <Group key={`group-${groupId}`}>
                        {/* Vertical from bar to meeting point (if needed) or just diagonals */}
                        {groupMembers.map(m => (
                          <Line
                            key={`to-twin-${m.id}`}
                            points={[meetingX, barY, m.x, m.y]}
                            stroke="#71717a"
                            strokeWidth={2}
                          />
                        ))}
                      </Group>
                    );
                  })}
                </Group>
              );
            })}

            {/* Members */}
            {members.map(member => (
              <Group
                key={member.id}
                x={member.x}
                y={member.y}
                draggable
                onDragEnd={(e) => handleDragEnd(member.id, e)}
                onClick={() => {
                  setSelectedId(member.id);
                  setSelectedUnionId(null);
                }}
                onTap={() => {
                  setSelectedId(member.id);
                  setSelectedUnionId(null);
                }}
              >
                {member.gender === 'male' ? (
                  <Group>
                    <Rect
                      width={MEMBER_SIZE}
                      height={MEMBER_SIZE}
                      offsetX={MEMBER_SIZE / 2}
                      offsetY={MEMBER_SIZE / 2}
                      fill={member.isIndex ? (selectedId === member.id ? '#94a3b8' : '#cbd5e1') : (selectedId === member.id ? '#f1f5f9' : 'white')}
                      stroke={selectedId === member.id ? '#3b82f6' : '#94a3b8'}
                      strokeWidth={selectedId === member.id ? 3 : 2}
                      cornerRadius={4}
                      shadowBlur={selectedId === member.id ? 10 : 0}
                      shadowColor="#3b82f6"
                    />
                    {/* Disability: Right half filled */}
                    {member.hasDisability && (
                      <Rect
                        width={MEMBER_SIZE / 2}
                        height={MEMBER_SIZE}
                        offsetX={0}
                        offsetY={MEMBER_SIZE / 2}
                        fill={member.isIndex ? "#475569" : "#94a3b8"}
                        cornerRadius={[0, 4, 4, 0]}
                      />
                    )}
                    {/* Chronic Disease: Bottom right quarter filled */}
                    {member.hasChronicDisease && (
                      <Rect
                        width={MEMBER_SIZE / 2}
                        height={MEMBER_SIZE / 2}
                        offsetX={0}
                        offsetY={0}
                        fill={member.isIndex ? "#475569" : "#94a3b8"}
                        cornerRadius={[0, 0, 4, 0]}
                      />
                    )}
                    {/* Deceased: X mark */}
                    {member.isDeceased && (
                      <Group>
                        <Line
                          points={[-MEMBER_SIZE / 2, -MEMBER_SIZE / 2, MEMBER_SIZE / 2, MEMBER_SIZE / 2]}
                          stroke="#475569"
                          strokeWidth={3}
                        />
                        <Line
                          points={[MEMBER_SIZE / 2, -MEMBER_SIZE / 2, -MEMBER_SIZE / 2, MEMBER_SIZE / 2]}
                          stroke="#475569"
                          strokeWidth={3}
                        />
                      </Group>
                    )}
                  </Group>
                ) : member.gender === 'female' ? (
                  <Group>
                    <Circle
                      radius={MEMBER_SIZE / 2}
                      fill={member.isIndex ? (selectedId === member.id ? '#94a3b8' : '#cbd5e1') : (selectedId === member.id ? '#f1f5f9' : 'white')}
                      stroke={selectedId === member.id ? '#e11d48' : '#94a3b8'}
                      strokeWidth={selectedId === member.id ? 3 : 2}
                      shadowBlur={selectedId === member.id ? 10 : 0}
                      shadowColor="#e11d48"
                    />
                    {/* Disability: Right half filled */}
                    {member.hasDisability && (
                      <Group clipFunc={(ctx) => {
                        ctx.rect(0, -MEMBER_SIZE / 2, MEMBER_SIZE / 2, MEMBER_SIZE);
                      }}>
                        <Circle
                          radius={MEMBER_SIZE / 2}
                          fill={member.isIndex ? "#475569" : "#94a3b8"}
                        />
                      </Group>
                    )}
                    {/* Chronic Disease: Bottom right quarter filled */}
                    {member.hasChronicDisease && (
                      <Group clipFunc={(ctx) => {
                        ctx.rect(0, 0, MEMBER_SIZE / 2, MEMBER_SIZE / 2);
                      }}>
                        <Circle
                          radius={MEMBER_SIZE / 2}
                          fill={member.isIndex ? "#475569" : "#94a3b8"}
                        />
                      </Group>
                    )}
                    {/* Deceased: X mark */}
                    {member.isDeceased && (
                      <Group>
                        <Line
                          points={[-MEMBER_SIZE / 2.8, -MEMBER_SIZE / 2.8, MEMBER_SIZE / 2.8, MEMBER_SIZE / 2.8]}
                          stroke="#475569"
                          strokeWidth={3}
                        />
                        <Line
                          points={[MEMBER_SIZE / 2.8, -MEMBER_SIZE / 2.8, -MEMBER_SIZE / 2.8, MEMBER_SIZE / 2.8]}
                          stroke="#475569"
                          strokeWidth={3}
                        />
                      </Group>
                    )}
                  </Group>
                ) : (
                  <Group>
                    <RegularPolygon
                      sides={3}
                      radius={MEMBER_SIZE / 1.5}
                      rotation={0}
                      fill={member.isIndex ? (selectedId === member.id ? '#94a3b8' : '#cbd5e1') : (selectedId === member.id ? '#f1f5f9' : 'white')}
                      stroke={selectedId === member.id ? '#10b981' : '#94a3b8'}
                      strokeWidth={selectedId === member.id ? 3 : 2}
                      shadowBlur={selectedId === member.id ? 10 : 0}
                      shadowColor="#10b981"
                      offsetY={MEMBER_SIZE / 10}
                    />
                    {/* Disability: Right half filled */}
                    {member.hasDisability && (
                      <Group clipFunc={(ctx) => {
                        ctx.rect(0, -MEMBER_SIZE, MEMBER_SIZE, MEMBER_SIZE * 2);
                      }}>
                        <RegularPolygon
                          sides={3}
                          radius={MEMBER_SIZE / 1.5}
                          rotation={0}
                          fill={member.isIndex ? "#475569" : "#94a3b8"}
                          offsetY={MEMBER_SIZE / 10}
                        />
                      </Group>
                    )}
                    {/* Chronic Disease: Bottom right quarter filled */}
                    {member.hasChronicDisease && (
                      <Group clipFunc={(ctx) => {
                        ctx.rect(0, 0, MEMBER_SIZE, MEMBER_SIZE);
                      }}>
                        <RegularPolygon
                          sides={3}
                          radius={MEMBER_SIZE / 1.5}
                          rotation={0}
                          fill={member.isIndex ? "#475569" : "#94a3b8"}
                          offsetY={MEMBER_SIZE / 10}
                        />
                      </Group>
                    )}
                    {/* Deceased: X mark */}
                    {member.isDeceased && (
                      <Group offsetY={MEMBER_SIZE / 10}>
                        <Line
                          points={[-MEMBER_SIZE / 3, -MEMBER_SIZE / 6, MEMBER_SIZE / 3, MEMBER_SIZE / 2]}
                          stroke="#475569"
                          strokeWidth={3}
                        />
                        <Line
                          points={[MEMBER_SIZE / 3, -MEMBER_SIZE / 6, -MEMBER_SIZE / 3, MEMBER_SIZE / 2]}
                          stroke="#475569"
                          strokeWidth={3}
                        />
                      </Group>
                    )}
                  </Group>
                )}
                
                <Text
                  text={member.name}
                  fontSize={12}
                  fontFamily="Inter"
                  fontStyle="bold"
                  fill="#18181b"
                  align="center"
                  width={MEMBER_SIZE * 2}
                  offsetX={MEMBER_SIZE}
                  y={MEMBER_SIZE / 2 + 10}
                />
                {member.age && (
                  <Text
                    text={member.age}
                    fontSize={20}
                    fontFamily="Inter"
                    fontStyle="bold"
                    fill={member.isDeceased ? "#475569" : "#1e293b"}
                    align="center"
                    verticalAlign="middle"
                    width={MEMBER_SIZE}
                    height={MEMBER_SIZE}
                    offsetX={MEMBER_SIZE / 2}
                    offsetY={MEMBER_SIZE / 2}
                  />
                )}
                {member.note && (
                  <Text
                    text={member.note}
                    fontSize={18}
                    fontFamily="Inter"
                    fill="#000000"
                    fontStyle="bold"
                    align="center"
                    width={MEMBER_SIZE * 3}
                    offsetX={MEMBER_SIZE * 1.5}
                    y={MEMBER_SIZE / 2 + 30}
                  />
                )}
              </Group>
            ))}
          </Layer>
          <Layer listening={tool !== 'select'}>
            {/* Drawings */}
            {lines.map((line, i) => (
              <Line
                key={i}
                points={line.points}
                stroke={line.color}
                strokeWidth={line.isEraser ? 30 : 3}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                opacity={line.isEraser ? 1 : 0.6}
                globalCompositeOperation={line.isEraser ? 'destination-out' : 'source-over'}
              />
            ))}
            {/* Eraser Cursor Feedback */}
            {tool === 'eraser' && cursorPos && (
              <Circle
                x={cursorPos.x}
                y={cursorPos.y}
                radius={15}
                stroke="#71717a"
                strokeWidth={1}
                dash={[4, 4]}
                listening={false}
              />
            )}
          </Layer>
        </Stage>
      </div>
    </div>

      {/* Project Management Modal */}
      <AnimatePresence>
        {isProjectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-zinc-900">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProjectModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">家庭管理中心</h2>
                  <p className="text-xs text-zinc-500 mt-1">在這裡管理您的所有家系圖家庭</p>
                </div>
                <button 
                  onClick={() => setIsProjectModalOpen(false)}
                  className="p-2 hover:bg-zinc-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-8">
                 {/* Draft Option */}
                  {isSavingDraftAsProject ? (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="p-4 rounded-2xl border bg-amber-50/50 border-amber-200 ring-1 ring-amber-200/30 shadow-inner space-y-3 cursor-default"
                    >
                      <div className="flex items-center gap-2">
                        <Save className="w-4 h-4 text-indigo-600 animate-pulse-subtle" />
                        <span className="text-sm font-bold text-zinc-700">儲存草稿為正式家庭</span>
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={draftProjectNameInput}
                          onChange={(e) => setDraftProjectNameInput(e.target.value)}
                          placeholder="請輸入家庭名稱，例如：王聰明家庭"
                          className="flex-1 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-zinc-900 font-bold"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const trimmed = draftProjectNameInput.trim();
                              if (!trimmed) return;
                              const newProject = {
                                id: 'project-' + Date.now(),
                                name: trimmed,
                                data: { members, unions, children, lines },
                                createdAt: Date.now(),
                                updatedAt: Date.now()
                              };
                              const updatedProjects = [...projects, newProject];
                              setProjects(updatedProjects);
                              setActiveProjectId(newProject.id);
                              localStorage.setItem('genogram-projects', JSON.stringify(updatedProjects));
                              localStorage.setItem('genogram-active-project-id', newProject.id);
                              setIsProjectModalOpen(false);
                              setIsSavingDraftAsProject(false);
                              alert('已成功將草稿存入家庭管理中心並切換！');
                            } else if (e.key === 'Escape') {
                              setIsSavingDraftAsProject(false);
                            }
                          }}
                          autoFocus
                        />
                        <button 
                          onClick={() => {
                            const trimmed = draftProjectNameInput.trim();
                            if (!trimmed) return;
                            const newProject = {
                              id: 'project-' + Date.now(),
                              name: trimmed,
                              data: { members, unions, children, lines },
                              createdAt: Date.now(),
                              updatedAt: Date.now()
                            };
                            const updatedProjects = [...projects, newProject];
                            setProjects(updatedProjects);
                            setActiveProjectId(newProject.id);
                            localStorage.setItem('genogram-projects', JSON.stringify(updatedProjects));
                            localStorage.setItem('genogram-active-project-id', newProject.id);
                            setIsProjectModalOpen(false);
                            setIsSavingDraftAsProject(false);
                            alert('已成功將草稿存入家庭管理中心並切換！');
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-100 shrink-0"
                        >
                          儲存
                        </button>
                        <button 
                          onClick={() => setIsSavingDraftAsProject(false)}
                          className="px-3 py-2 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-500 rounded-xl text-sm font-bold transition-all shadow-sm shrink-0"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={switchToDraft}
                      className={`group flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                        !activeProjectId 
                          ? 'bg-amber-50 border-amber-200 ring-1 ring-amber-200 shadow-sm' 
                          : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`p-3 rounded-xl transition-colors ${!activeProjectId ? 'bg-amber-500 text-white shadow-md shadow-amber-100' : 'bg-white text-zinc-400'}`}>
                          <Pencil className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-zinc-900 truncate font-sans">隨意繪製 (我的草案)</h4>
                          <p className="text-xs text-zinc-500 mt-0.5 truncate">適合臨時繪製，不會儲存為正式家庭</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDraftProjectNameInput('從草稿儲存的家庭');
                            setIsSavingDraftAsProject(true);
                          }}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                          title="將此隨手記草稿儲存至案家中心"
                        >
                          <Save className="w-3.5 h-3.5 animate-pulse-subtle" />
                          儲存至案家
                        </button>
                        {!activeProjectId && (
                          <div className="text-amber-600 px-1">
                            <Check className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                {/* New Project Input */}
                <div className="space-y-3 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">建立家庭</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="例如：王小明家庭、2024個案A..."
                      className="flex-1 px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      onKeyDown={(e) => e.key === 'Enter' && createNewProject(newProjectName)}
                    />
                    <button 
                      onClick={() => createNewProject(newProjectName)}
                      className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      建立
                    </button>
                  </div>
                </div>

                {/* Project List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">已儲存的家庭 ({projects.length})</label>
                    {projects.length > 0 && <span className="text-[10px] text-zinc-400">點擊切換項目</span>}
                  </div>
                  
                  <div className="grid gap-3 pb-4">
                    {projects.length === 0 ? (
                      <div className="py-12 text-center border-2 border-dashed border-zinc-100 rounded-3xl bg-zinc-50/30">
                        <FolderOpen className="w-12 h-12 text-zinc-200 mx-auto mb-3" />
                        <p className="text-sm text-zinc-400 font-medium">目前還沒有儲存的家庭</p>
                        <p className="text-[10px] text-zinc-300 mt-1">上面輸入名稱來建立新的家系圖</p>
                      </div>
                    ) : (
                      [...projects].sort((a, b) => b.updatedAt - a.updatedAt).map(project => (
                        <div 
                          key={project.id}
                          className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all relative ${
                            activeProjectId === project.id 
                              ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200 shadow-sm' 
                              : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-md'
                          }`}
                        >
                          {editingProjectId === project.id ? (
                            <div 
                              className="flex flex-1 items-center gap-3 min-w-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl shrink-0">
                                <FolderOpen className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0 flex gap-1.5 items-center">
                                <input 
                                  type="text"
                                  value={editingProjectName}
                                  onChange={(e) => setEditingProjectName(e.target.value)}
                                  className="flex-1 min-w-0 px-3 py-1.5 bg-white border border-indigo-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-zinc-900"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const trimmed = editingProjectName.trim();
                                      if (trimmed) {
                                        renameProject(project.id, trimmed);
                                        setEditingProjectId(null);
                                      }
                                    } else if (e.key === 'Escape') {
                                      setEditingProjectId(null);
                                    }
                                  }}
                                  autoFocus
                                />
                                <button 
                                  onClick={() => {
                                    const trimmed = editingProjectName.trim();
                                    if (trimmed) {
                                      renameProject(project.id, trimmed);
                                      setEditingProjectId(null);
                                    }
                                  }}
                                  className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 rounded-xl transition-all shrink-0"
                                  title="確認修改"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => setEditingProjectId(null)}
                                  className="p-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-400 border border-zinc-200 rounded-xl transition-all shrink-0"
                                  title="取消"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div 
                                className="flex flex-1 items-center gap-4 cursor-pointer min-w-0"
                                onClick={() => loadProject(project.id)}
                              >
                                <div className={`p-3 rounded-xl transition-colors ${activeProjectId === project.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200/50' : 'bg-white border border-zinc-100 text-zinc-300 group-hover:text-indigo-400 group-hover:border-indigo-100'}`}>
                                  <FolderOpen className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className={`font-bold truncate flex items-center gap-2 ${activeProjectId === project.id ? 'text-indigo-900' : 'text-zinc-900'}`}>
                                    {project.name}
                                    {activeProjectId === project.id && <span className="bg-indigo-600 text-white text-[8px] px-1.5 py-0.5 rounded font-black tracking-tighter">正在編輯</span>}
                                  </h4>
                                  <p className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1 font-medium">
                                    <RotateCcw className="w-3 h-3" />
                                    更新於: {new Date(project.updatedAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex gap-1.5 items-center shrink-0">
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingProjectId(project.id);
                                    setEditingProjectName(project.name);
                                  }}
                                  className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-indigo-100 rounded-xl transition-all shadow-none hover:shadow-sm"
                                  title="重新命名"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProjectToDelete(project.id);
                                  }}
                                  className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-all shadow-none hover:shadow-sm"
                                  title="刪除"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Overlay */}
      <AnimatePresence>
        {projectToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setProjectToDelete(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border border-zinc-100"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900">永久刪除家庭？</h3>
              <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
                確定要刪除「<span className="font-bold text-zinc-700">{projects.find(p => p.id === projectToDelete)?.name}</span>」嗎？<br />此動作將無法復原。
              </p>
              <div className="grid grid-cols-2 gap-3 mt-8">
                 <button 
                  onClick={() => setProjectToDelete(null)} 
                  className="py-3 bg-zinc-100 text-zinc-600 rounded-2xl text-sm font-bold hover:bg-zinc-200 transition-colors"
                >
                  取消
                </button>
                 <button 
                  onClick={() => deleteProject(projectToDelete)} 
                  className="py-3 bg-rose-600 text-white rounded-2xl text-sm font-bold hover:bg-rose-700 transition-shadow shadow-lg shadow-rose-100"
                >
                  確定刪除
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
