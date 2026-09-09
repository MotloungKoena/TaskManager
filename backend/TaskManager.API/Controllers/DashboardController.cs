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
    public class DashboardController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public DashboardController(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetDashboardSummary()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            // Get all projects the user is a member of
            var projectIds = await _context.ProjectMembers
                .Where(pm => pm.UserId == userId)
                .Select(pm => pm.ProjectId)
                .ToListAsync();

            var createdProjects = await _context.Projects
                .Where(p => p.CreatedById == userId)
                .Select(p => p.Id)
                .ToListAsync();

            var allProjectIds = projectIds.Union(createdProjects).Distinct().ToList();

            // Count projects
            var projectCount = allProjectIds.Count;

            // Count tasks across all projects
            var taskCount = await _context.Tasks
                .Where(t => allProjectIds.Contains(t.ProjectId))
                .CountAsync();

            // Count unique team members across all projects
            var memberIds = await _context.ProjectMembers
                .Where(pm => allProjectIds.Contains(pm.ProjectId))
                .Select(pm => pm.UserId)
                .Distinct()
                .ToListAsync();

            // Add the current user if not in the list
            if (!memberIds.Contains(userId))
                memberIds.Add(userId);

            var memberCount = memberIds.Count;

            // Get recent projects (last 5)
            var recentProjects = await _context.Projects
                .Where(p => allProjectIds.Contains(p.Id))
                .OrderByDescending(p => p.CreatedAt)
                .Take(5)
                .Select(p => new
                {
                    p.Id,
                    p.Name,
                    p.Description,
                    p.CreatedAt,
                    TaskCount = _context.Tasks.Count(t => t.ProjectId == p.Id),
                    MemberCount = _context.ProjectMembers.Count(pm => pm.ProjectId == p.Id) + 1 // +1 for creator
                })
                .ToListAsync();

            // Task status breakdown
            var taskStatusBreakdown = await _context.Tasks
                .Where(t => allProjectIds.Contains(t.ProjectId))
                .GroupBy(t => t.Status)
                .Select(g => new
                {
                    Status = g.Key,
                    Count = g.Count()
                })
                .ToListAsync();

            return Ok(new
            {
                ProjectCount = projectCount,
                TaskCount = taskCount,
                MemberCount = memberCount,
                RecentProjects = recentProjects,
                TaskStatusBreakdown = taskStatusBreakdown
            });
        }
    }
}