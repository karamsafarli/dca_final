import { api } from '../lib/api';

export const crisisApi = {
  loginDispatcher: (credentials) => api.post('/auth/login', credentials),

  logoutDispatcher: () => api.post('/auth/logout'),

  getCurrentDispatcher: () => api.get('/auth/me'),

  getZones: () => api.get('/zones'),

  getEvacuationPlan: ({ zoneId, lat, lng, accessibleOnly, citizenCategory }) => {
    const params = {};
    if (zoneId) params.zoneId = zoneId;
    if (lat !== undefined && lat !== null) params.lat = lat;
    if (lng !== undefined && lng !== null) params.lng = lng;
    if (accessibleOnly !== undefined) params.accessibleOnly = accessibleOnly;
    if (citizenCategory) params.citizenCategory = citizenCategory;
    return api.get('/citizen/evacuation-plan', { params });
  },

  sendSos: (payload) => api.post('/citizen/sos', payload),

  markSafe: (payload) => api.patch('/citizen/safe', payload),

  getDispatcherDashboard: () => api.get('/dispatcher/dashboard'),

  updateRoadStatus: (roadId, payload) =>
    api.patch(`/traffic/roads/${roadId}/status`, payload),

  updateShelterOccupancy: (pointId, payload) =>
    api.patch(`/dispatcher/shelters/${pointId}/occupancy`, payload),

  dispatchBrigade: (sosId, brigadeId) =>
    api.post(`/dispatcher/sos/${sosId}/dispatch`, brigadeId ? { brigadeId } : {}),

  executeAlert: (alertId) => api.post(`/dispatcher/alerts/${alertId}/execute`),

  dismissAlert: (alertId) => api.patch(`/dispatcher/alerts/${alertId}/dismiss`),

  simulateSosBurst: (payload = {}) => api.post('/simulation/sos-burst', payload),

  simulateRoadToggle: (payload = {}) => api.post('/simulation/road-toggle', payload),

  simulateOccupancySpike: (payload = {}) =>
    api.post('/simulation/occupancy-spike', payload),

  resetSimulation: () => api.post('/simulation/reset'),
};
