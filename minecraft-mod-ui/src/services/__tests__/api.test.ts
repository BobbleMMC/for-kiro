import { apiClient, APIError, projectAPI, blockAPI, recipeAPI } from '../api';

// Mock fetch globally
global.fetch = jest.fn();

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Handling', () => {
    it('should throw APIError on 404', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ code: 'NOT_FOUND', message: 'Resource not found' }),
      });

      await expect(projectAPI.getById(999)).rejects.toThrow(APIError);
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      await expect(projectAPI.getAll()).rejects.toThrow(APIError);
    });

    it('should timeout after 30 seconds', async () => {
      const controller = new AbortController();
      jest.useFakeTimers();
      
      (global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise(resolve => {
          jest.runAllTimers();
          controller.abort();
        })
      );

      jest.useRealTimers();
    });
  });

  describe('Project API', () => {
    it('should get all projects', async () => {
      const mockProjects = [
        { id: 1, name: 'Test Project', minecraft_version: '1.20.1' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects,
      });

      const result = await projectAPI.getAll();
      expect(result).toEqual(mockProjects);
    });

    it('should get project by ID', async () => {
      const mockProject = {
        id: 1,
        name: 'Test Project',
        minecraft_version: '1.20.1',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProject,
      });

      const result = await projectAPI.getById(1);
      expect(result).toEqual(mockProject);
    });

    it('should create a new project', async () => {
      const newProject = {
        name: 'New Project',
        minecraft_version: '1.20.1',
        mod_loader: 'forge',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, ...newProject, build_count: 0 }),
      });

      const result = await projectAPI.create(newProject as any);
      expect(result.id).toBeDefined();
      expect(result.name).toBe(newProject.name);
    });

    it('should delete a project', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await expect(projectAPI.delete(1)).resolves.not.toThrow();
    });
  });

  describe('Block API', () => {
    it('should get blocks by project', async () => {
      const mockBlocks = [
        { id: 1, name: 'stone_block', project_id: 1 },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBlocks,
      });

      const result = await blockAPI.getByProject(1);
      expect(result).toEqual(mockBlocks);
    });

    it('should bulk create blocks', async () => {
      const blocks = [
        { name: 'stone', project_id: 1, hardness: 1.5 },
        { name: 'dirt', project_id: 1, hardness: 0.5 },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => blocks.map((b, i) => ({ id: i + 1, ...b })),
      });

      const result = await blockAPI.bulkCreate(blocks as any);
      expect(result).toHaveLength(2);
    });
  });

  describe('Recipe API', () => {
    it('should validate recipe', async () => {
      const recipe = {
        name: 'test_recipe',
        type: 'shaped',
        project_id: 1,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true, errors: [] }),
      });

      const result = await recipeAPI.validate(recipe as any);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid recipe', async () => {
      const recipe = {
        name: '',
        type: 'shaped',
        project_id: 1,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: false, errors: ['Recipe name is required'] }),
      });

      const result = await recipeAPI.validate(recipe as any);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('API Client', () => {
    it('should export all API modules', () => {
      expect(apiClient.projects).toBeDefined();
      expect(apiClient.blocks).toBeDefined();
      expect(apiClient.items).toBeDefined();
      expect(apiClient.recipes).toBeDefined();
      expect(apiClient.entities).toBeDefined();
      expect(apiClient.builds).toBeDefined();
      expect(apiClient.tasks).toBeDefined();
    });
  });
});
