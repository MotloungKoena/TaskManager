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
    [Authorize]
    public class TasksController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public TasksController(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        // GET: api/tasks/project/{projectId}
        [HttpGet("project/{projectId}")]
        public async Task<IActionResult> GetProjectTasks(int projectId)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            // Check if user has access to this project
            var hasAccess = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

            if (!hasAccess)
                return Forbid();

            var tasks = await _context.Tasks
                .Where(t => t.ProjectId == projectId)
                .Include(t => t.AssignedTo)
                .Include(t => t.CreatedBy)
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new
                {
                    t.Id,
                    t.Title,
                    t.Description,
                    t.Status,
                    t.Priority,
                    t.DueDate,
                    t.CreatedAt,
                    AssignedTo = t.AssignedTo != null ? new { t.AssignedTo.Id, t.AssignedTo.FullName, t.AssignedTo.Email } : null,
                    CreatedBy = t.CreatedBy != null ? new { t.CreatedBy.FullName } : null
                })
                .ToListAsync();

            return Ok(tasks);
        }

        // POST: api/tasks
        [HttpPost]
        public async Task<IActionResult> CreateTask([FromBody] CreateTaskModel model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            // Check if user has access to this project
            var hasAccess = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == model.ProjectId && pm.UserId == userId);

            if (!hasAccess)
                return Forbid();

            // Check if project exists
            var project = await _context.Projects.FindAsync(model.ProjectId);
            if (project == null)
                return NotFound(new { message = "Project not found" });

            // Check if assigned user exists and is a member (if provided)
            ApplicationUser? assignedUser = null;
            if (!string.IsNullOrEmpty(model.AssignedToId))
            {
                assignedUser = await _userManager.FindByIdAsync(model.AssignedToId);
                if (assignedUser == null)
                    return BadRequest(new { message = "Assigned user not found" });

                var isMember = await _context.ProjectMembers
                    .AnyAsync(pm => pm.ProjectId == model.ProjectId && pm.UserId == model.AssignedToId);

                if (!isMember)
                    return BadRequest(new { message = "Assigned user is not a member of this project" });
            }

            var task = new ProjectTask
            {
                ProjectId = model.ProjectId,
                Title = model.Title,
                Description = model.Description,
                Status = model.Status ?? "Todo",
                Priority = model.Priority ?? "Medium",
                DueDate = model.DueDate,
                AssignedToId = model.AssignedToId,
                CreatedById = userId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            // Load the assigned user for response
            if (task.AssignedToId != null)
            {
                task.AssignedTo = await _userManager.FindByIdAsync(task.AssignedToId);
            }

            return CreatedAtAction(nameof(GetTask), new { id = task.Id }, new
            {
                task.Id,
                task.Title,
                task.Description,
                task.Status,
                task.Priority,
                task.DueDate,
                task.CreatedAt,
                AssignedTo = task.AssignedTo != null ? new { task.AssignedTo.Id, task.AssignedTo.FullName, task.AssignedTo.Email } : null
            });
        }

        // GET: api/tasks/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTask(int id)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var task = await _context.Tasks
                .Include(t => t.Project)
                .Include(t => t.AssignedTo)
                .Include(t => t.CreatedBy)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (task == null)
                return NotFound(new { message = "Task not found" });

            // Check if user has access to this project
            var hasAccess = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == task.ProjectId && pm.UserId == userId);

            if (!hasAccess)
                return Forbid();

            return Ok(new
            {
                task.Id,
                task.Title,
                task.Description,
                task.Status,
                task.Priority,
                task.DueDate,
                task.CreatedAt,
                AssignedTo = task.AssignedTo != null ? new { task.AssignedTo.Id, task.AssignedTo.FullName, task.AssignedTo.Email } : null,
                CreatedBy = task.CreatedBy != null ? new { task.CreatedBy.FullName } : null
            });
        }

        // PUT: api/tasks/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTask(int id, [FromBody] UpdateTaskModel model)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var task = await _context.Tasks
                .Include(t => t.Project)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (task == null)
                return NotFound(new { message = "Task not found" });

            // Check if user has access to this project
            var hasAccess = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == task.ProjectId && pm.UserId == userId);

            if (!hasAccess)
                return Forbid();

            // Check if assigned user exists (if provided)
            if (!string.IsNullOrEmpty(model.AssignedToId))
            {
                var assignedUser = await _userManager.FindByIdAsync(model.AssignedToId);
                if (assignedUser == null)
                    return BadRequest(new { message = "Assigned user not found" });

                var isMember = await _context.ProjectMembers
                    .AnyAsync(pm => pm.ProjectId == task.ProjectId && pm.UserId == model.AssignedToId);

                if (!isMember)
                    return BadRequest(new { message = "Assigned user is not a member of this project" });
            }

            task.Title = model.Title;
            task.Description = model.Description;
            task.Status = model.Status;
            task.Priority = model.Priority;
            task.DueDate = model.DueDate;
            task.AssignedToId = model.AssignedToId;
            task.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                task.Id,
                task.Title,
                task.Description,
                task.Status,
                task.Priority,
                task.DueDate,
                Message = "Task updated successfully"
            });
        }

        // DELETE: api/tasks/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTask(int id)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var task = await _context.Tasks
                .Include(t => t.Project)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (task == null)
                return NotFound(new { message = "Task not found" });

            // Check if user has access to this project
            var hasAccess = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == task.ProjectId && pm.UserId == userId);

            if (!hasAccess)
                return Forbid();

            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Task deleted successfully" });
        }

        // PATCH: api/tasks/{id}/status
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateTaskStatus(int id, [FromBody] UpdateStatusModel model)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var task = await _context.Tasks
                .Include(t => t.Project)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (task == null)
                return NotFound(new { message = "Task not found" });

            // Check if user has access to this project
            var hasAccess = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == task.ProjectId && pm.UserId == userId);

            if (!hasAccess)
                return Forbid();

            task.Status = model.Status;
            task.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                task.Id,
                task.Status,
                Message = "Status updated successfully"
            });
        }
    }

    public class CreateTaskModel
    {
        public int ProjectId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? Status { get; set; }
        public string? Priority { get; set; }
        public DateTime? DueDate { get; set; }
        public string? AssignedToId { get; set; }
    }

    public class UpdateTaskModel
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public DateTime? DueDate { get; set; }
        public string? AssignedToId { get; set; }
    }

    public class UpdateStatusModel
    {
        public string Status { get; set; } = string.Empty;
    }
}