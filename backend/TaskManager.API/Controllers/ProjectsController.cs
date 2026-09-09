using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskManager.API.Data;
using TaskManager.API.Models;
using System.Security.Claims;

namespace TaskManager.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // Require authentication for all endpoints
    public class ProjectsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public ProjectsController(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        // GET: api/projects
        [HttpGet]
        public async Task<IActionResult> GetProjects()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var projects = await _context.Projects
                .Include(p => p.Members)
                .Where(p => p.Members.Any(m => m.UserId == userId) || p.CreatedById == userId)
                .Select(p => new
                {
                    p.Id,
                    p.Name,
                    p.Description,
                    p.CreatedAt,
                    MemberCount = p.Members.Count,
                    TaskCount = p.Tasks.Count,
                    CreatedBy = p.CreatedBy != null ? new { p.CreatedBy.FullName, p.CreatedBy.Email } : null
                })
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return Ok(projects);
        }

        // GET: api/projects/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetProject(int id)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var project = await _context.Projects
                .Include(p => p.Members)
                    .ThenInclude(m => m.User)
                .Include(p => p.Tasks)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (project == null)
                return NotFound(new { message = "Project not found" });

            // Check if user is a member or creator
            var isMember = project.Members.Any(m => m.UserId == userId);
            var isCreator = project.CreatedById == userId;

            if (!isMember && !isCreator)
                return Forbid();

            return Ok(new
            {
                project.Id,
                project.Name,
                project.Description,
                project.CreatedAt,
                Members = project.Members.Select(m => new
                {
                    m.UserId,
                    m.User.FullName,
                    m.User.Email,
                    m.Role,
                    m.JoinedAt
                }),
                Tasks = project.Tasks.Select(t => new
                {
                    t.Id,
                    t.Title,
                    t.Status,
                    t.Priority,
                    t.DueDate,
                    AssignedTo = t.AssignedTo != null ? new { t.AssignedTo.FullName, t.AssignedTo.Email } : null
                })
            });
        }

        // POST: api/projects
        [HttpPost]
        public async Task<IActionResult> CreateProject([FromBody] CreateProjectModel model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var user = await _userManager.FindByIdAsync(userId);

            if (user == null)
                return Unauthorized();

            var project = new Project
            {
                Name = model.Name,
                Description = model.Description,
                CreatedById = userId,
                CreatedAt = DateTime.UtcNow
            };

            // Add creator as admin member
            project.Members.Add(new ProjectMember
            {
                UserId = userId,
                Role = "Admin",
                JoinedAt = DateTime.UtcNow
            });

            _context.Projects.Add(project);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetProject), new { id = project.Id }, new
            {
                project.Id,
                project.Name,
                project.Description,
                project.CreatedAt,
                Message = "Project created successfully"
            });
        }

        // PUT: api/projects/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProject(int id, [FromBody] UpdateProjectModel model)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var project = await _context.Projects
                .Include(p => p.Members)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (project == null)
                return NotFound(new { message = "Project not found" });

            // Check if user is admin or creator
            var isAdmin = project.Members.Any(m => m.UserId == userId && m.Role == "Admin");
            var isCreator = project.CreatedById == userId;

            if (!isAdmin && !isCreator)
                return Forbid();

            project.Name = model.Name;
            project.Description = model.Description;
            project.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                project.Id,
                project.Name,
                project.Description,
                Message = "Project updated successfully"
            });
        }

        // DELETE: api/projects/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProject(int id)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var project = await _context.Projects
                .Include(p => p.Members)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (project == null)
                return NotFound(new { message = "Project not found" });

            // Check if user is creator only (only creator can delete)
            if (project.CreatedById != userId)
                return Forbid();

            _context.Projects.Remove(project);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Project deleted successfully" });
        }

        // POST: api/projects/{id}/members
        [HttpPost("{id}/members")]
        public async Task<IActionResult> AddMember(int id, [FromBody] AddMemberModel model)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var project = await _context.Projects
                .Include(p => p.Members)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (project == null)
                return NotFound(new { message = "Project not found" });

            // Check if user is admin or creator
            var isAdmin = project.Members.Any(m => m.UserId == userId && m.Role == "Admin");
            var isCreator = project.CreatedById == userId;

            if (!isAdmin && !isCreator)
                return Forbid();

            // Check if user exists
            var userToAdd = await _userManager.FindByEmailAsync(model.Email);
            if (userToAdd == null)
                return NotFound(new { message = "User not found" });

            // Check if already a member
            if (project.Members.Any(m => m.UserId == userToAdd.Id))
                return BadRequest(new { message = "User is already a member" });

            project.Members.Add(new ProjectMember
            {
                UserId = userToAdd.Id,
                Role = model.Role ?? "Member",
                JoinedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Member added successfully",
                user = new { userToAdd.Id, userToAdd.FullName, userToAdd.Email }
            });
        }
    }

    public class CreateProjectModel
    {
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }

    public class UpdateProjectModel
    {
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }

    public class AddMemberModel
    {
        public string Email { get; set; } = string.Empty;
        public string? Role { get; set; }
    }
}