// frontend/src/components/HierarchyFilter.jsx
import { useState, useEffect } from "react";
import { 
  ChevronDown, 
  ChevronRight, 
  MapPin, 
  Building2, 
  Home, 
  Search,
  Globe,
  X,
  Filter,
  Menu
} from "lucide-react";

export default function HierarchyFilter({ user, onSelect, selectedPath, currentAdminLevel }) {
  const [hierarchyData, setHierarchyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    fetchHierarchyData();
  }, []);

  useEffect(() => {
    if (searchTerm.trim().length > 0) {
      filterHierarchy(searchTerm);
      setShowSearchResults(true);
      // Auto-expand when searching
      setIsCollapsed(false);
    } else {
      setFilteredData(hierarchyData);
      setShowSearchResults(false);
      // Collapse when search is cleared
      setIsCollapsed(true);
      // Reset expanded nodes to empty (all collapsed)
      setExpandedNodes({});
    }
  }, [searchTerm, hierarchyData]);

  const fetchHierarchyData = async () => {
    try {
      const adminRes = await fetch("http://127.0.0.1:8000/hierarchy/my-admin-info/", {
        headers: { "Authorization": `Token ${user.token}` }
      });
      const adminInfo = await adminRes.json();
      
      let regionsUrl = "http://127.0.0.1:8000/facilities/regions/";
      
      if (adminInfo.level === 'regional' && adminInfo.region) {
        regionsUrl += `?region_id=${adminInfo.region.id}`;
      }
      
      const regionsRes = await fetch(regionsUrl, {
        headers: { "Authorization": `Token ${user.token}` }
      });
      let regions = await regionsRes.json();
      
      if (adminInfo.level === 'district' && adminInfo.district) {
        const tree = [{
          id: `district_${adminInfo.district.id}`,
          name: adminInfo.district.name,
          type: 'district',
          region: adminInfo.region?.name,
          region_id: adminInfo.region?.id,
          children: []
        }];
        
        const facilitiesRes = await fetch(`http://127.0.0.1:8000/facilities/districts/${adminInfo.district.id}/facilities/`, {
          headers: { "Authorization": `Token ${user.token}` }
        });
        
        if (facilitiesRes.ok) {
          const facilities = await facilitiesRes.json();
          tree[0].children = facilities.map(f => ({
            id: `facility_${f.id}`,
            name: f.name,
            type: 'facility',
            facility_type: f.facility_type,
            children: []
          }));
        }
        
        setHierarchyData(tree);
        setFilteredData(tree);
        setExpandedNodes({}); // ✅ All collapsed
        setLoading(false);
        return;
      }
      
      if (adminInfo.level === 'facility' && adminInfo.facility) {
        const tree = [{
          id: `facility_${adminInfo.facility.id}`,
          name: adminInfo.facility.name,
          type: 'facility',
          facility_type: adminInfo.facility.type,
          children: []
        }];
        setHierarchyData(tree);
        setFilteredData(tree);
        setExpandedNodes({}); // ✅ All collapsed
        setLoading(false);
        return;
      }
      
      const tree = [];
      
      for (const region of regions) {
        const districtsRes = await fetch(`http://127.0.0.1:8000/facilities/regions/${region.id}/districts/`, {
          headers: { "Authorization": `Token ${user.token}` }
        });
        const districts = await districtsRes.json();
        
        const regionNode = {
          id: `region_${region.id}`,
          name: region.name,
          type: 'region',
          code: region.code,
          children: []
        };
        
        for (const district of districts) {
          const facilitiesRes = await fetch(`http://127.0.0.1:8000/facilities/districts/${district.id}/facilities/`, {
            headers: { "Authorization": `Token ${user.token}` }
          });
          const facilities = await facilitiesRes.json();
          
          const districtNode = {
            id: `district_${district.id}`,
            name: district.name,
            type: 'district',
            children: facilities.map(f => ({
              id: `facility_${f.id}`,
              name: f.name,
              type: 'facility',
              facility_type: f.facility_type,
              children: []
            }))
          };
          regionNode.children.push(districtNode);
        }
        tree.push(regionNode);
      }
      
      setHierarchyData(tree);
      setFilteredData(tree);
      setExpandedNodes({}); // ✅ All collapsed
      
    } catch (error) {
      console.error("Error fetching hierarchy data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterHierarchy = (searchText) => {
    const term = searchText.toLowerCase().trim();
    if (!term) {
      setFilteredData(hierarchyData);
      return;
    }

    const filterNodes = (nodes) => {
      const results = [];
      
      for (const node of nodes) {
        const nodeMatches = node.name.toLowerCase().includes(term);
        
        let filteredChildren = [];
        if (node.children && node.children.length > 0) {
          filteredChildren = filterNodes(node.children);
        }
        
        if (nodeMatches || filteredChildren.length > 0) {
          results.push({
            ...node,
            children: filteredChildren
          });
        }
      }
      
      return results;
    };

    const filtered = filterNodes(hierarchyData);
    setFilteredData(filtered);
    
    // Auto-expand all nodes in search results
    if (filtered.length > 0) {
      const expandNodes = (nodes) => {
        const expanded = {};
        for (const node of nodes) {
          expanded[node.id] = true;
          if (node.children && node.children.length > 0) {
            Object.assign(expanded, expandNodes(node.children));
          }
        }
        return expanded;
      };
      setExpandedNodes(expandNodes(filtered));
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setFilteredData(hierarchyData);
    setShowSearchResults(false);
    setIsCollapsed(true);
    setExpandedNodes({}); // ✅ Collapse everything
  };

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const handleSelect = (node) => {
    let filterValue = {};
    
    if (node.type === 'national') {
      filterValue = { level: 'national', name: 'National (All Data)', id: null };
    } else if (node.type === 'region') {
      filterValue = { level: 'region', name: node.name, id: node.id.replace('region_', '') };
    } else if (node.type === 'district') {
      filterValue = { level: 'district', name: node.name, id: node.id.replace('district_', '') };
    } else if (node.type === 'facility') {
      filterValue = { level: 'facility', name: node.name, id: node.id.replace('facility_', '') };
    }
    
    onSelect(filterValue);
    // Don't clear search or collapse - keep the selection visible
  };

  const renderTree = (nodes, level = 0) => {
    return nodes.map(node => {
      const isExpanded = expandedNodes[node.id] || false; // ✅ Default to false (collapsed)
      const isSelected = selectedPath?.id === node.id.replace(/^(region_|district_|facility_)/, '') && selectedPath?.level === node.type;
      const hasChildren = node.children && node.children.length > 0;
      
      return (
        <div key={node.id} className="select-none">
          <div
            className={`flex items-center py-2 px-3 hover:bg-green-50 rounded-lg cursor-pointer transition group ${
              isSelected ? 'bg-green-50 border-l-4 border-green-500' : ''
            }`}
            style={{ paddingLeft: `${level * 24 + 12}px` }}
            onClick={() => handleSelect(node)}
          >
            {/* Expand/Collapse Button */}
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(node.id);
                }}
                className="mr-2 text-gray-400 hover:text-gray-600 transition"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            )}
            
            {/* Icon based on type */}
            {node.type === 'region' && (
              <MapPin className={`w-4 h-4 mr-2 ${isSelected ? 'text-green-600' : 'text-gray-400'}`} />
            )}
            {node.type === 'district' && (
              <Building2 className={`w-4 h-4 mr-2 ${isSelected ? 'text-green-600' : 'text-gray-400'}`} />
            )}
            {node.type === 'facility' && (
              <Home className={`w-4 h-4 mr-2 ${isSelected ? 'text-green-600' : 'text-gray-400'}`} />
            )}
            
            {/* Node Name */}
            <span className={`text-sm font-medium ${
              isSelected ? 'text-green-700' : 'text-gray-700'
            }`}>
              {node.name}
            </span>
            
            {/* Badge for count */}
            {hasChildren && (
              <span className="ml-2 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                {node.children.length}
              </span>
            )}
            
            {/* Facility type badge */}
            {node.type === 'facility' && node.facility_type && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                {node.facility_type}
              </span>
            )}
          </div>
          
          {/* Render children if expanded */}
          {isExpanded && hasChildren && (
            <div>
              {renderTree(node.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  const displayData = searchTerm.trim() ? filteredData : hierarchyData;
  const hasResults = displayData && displayData.length > 0;
  const totalItems = searchTerm.trim() ? 
    JSON.stringify(displayData).match(/id/g)?.length || 0 : 
    hierarchyData.reduce((acc, node) => acc + 1 + (node.children?.length || 0), 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">Location</h3>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {isCollapsed && !searchTerm ? (
            <span className="flex items-center gap-1">
             
            </span>
          ) : (
            "Click on any location to filter data"
          )}
        </p>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search locations..."
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {searchTerm && (
          <div className="mt-2 text-xs text-gray-500">
            Found {totalItems} result{totalItems !== 1 ? 's' : ''}
          </div>
        )}
        {!searchTerm && isCollapsed && (
          <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
            <ChevronRight className="w-3 h-3" />
      
          </div>
        )}
      </div>

      {/* Hierarchy Tree */}
      <div className="max-h-[500px] overflow-y-auto p-2">
        {/* National Option - only for National Admin */}
        {(currentAdminLevel === 'national' || !currentAdminLevel) && (
          <div
            className={`flex items-center py-2 px-3 hover:bg-green-50 rounded-lg cursor-pointer transition mb-1 ${
              selectedPath?.level === 'national' ? 'bg-green-50 border-l-4 border-green-500' : ''
            }`}
            onClick={() => handleSelect({ type: 'national', name: 'National (All Data)', id: null })}
          >
            <Globe className={`w-4 h-4 mr-2 ${selectedPath?.level === 'national' ? 'text-green-600' : 'text-gray-400'}`} />
            <span className={`text-sm font-medium ${
              selectedPath?.level === 'national' ? 'text-green-700' : 'text-gray-700'
            }`}>
              National (All Data)
            </span>
          </div>
        )}
        
        {/* Render hierarchy tree */}
        {hasResults ? (
          renderTree(displayData)
        ) : (
          <div className="text-center py-8">
            <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No locations found</p>
            <p className="text-xs text-gray-300 mt-1">Try adjusting your search</p>
          </div>
        )}
      </div>
    </div>
  );
}