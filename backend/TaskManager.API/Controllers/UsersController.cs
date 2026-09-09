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
    public class UsersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IWebHostEnvironment _webHostEnvironment;

        public UsersController(
            ApplicationDbContext context,
            UserManager<ApplicationUser> userManager,
            IWebHostEnvironment webHostEnvironment)
        {
            _context = context;
            _userManager = userManager;
            _webHostEnvironment = webHostEnvironment;
        }

        // GET: api/users/profile
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var user = await _userManager.FindByIdAsync(userId);

            if (user == null)
                return NotFound(new { message = "User not found" });

            return Ok(new
            {
                user.Id,
                user.Email,
                user.FullName,
                user.ProfilePictureUrl,
                user.IsOnline,
                user.LastSeenAt,
                user.CreatedAt
            });
        }

        // PUT: api/users/profile
        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileModel model)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var user = await _userManager.FindByIdAsync(userId);

            if (user == null)
                return NotFound(new { message = "User not found" });

            if (!string.IsNullOrEmpty(model.FullName))
                user.FullName = model.FullName;

            if (!string.IsNullOrEmpty(model.Email))
                user.Email = model.Email;

            await _userManager.UpdateAsync(user);

            return Ok(new
            {
                message = "Profile updated successfully",
                user = new
                {
                    user.Id,
                    user.Email,
                    user.FullName,
                    user.ProfilePictureUrl
                }
            });
        }

        // POST: api/users/upload-avatar
        [HttpPost("upload-avatar")]
        public async Task<IActionResult> UploadAvatar([FromForm] IFormFile file)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var user = await _userManager.FindByIdAsync(userId);

            if (user == null)
                return NotFound(new { message = "User not found" });

            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file uploaded" });

            // Validate file type
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
            var extension = Path.GetExtension(file.FileName).ToLower();
            if (!allowedExtensions.Contains(extension))
                return BadRequest(new { message = "Only image files are allowed (jpg, jpeg, png, gif, webp)" });

            // Validate file size (max 5MB)
            if (file.Length > 5 * 1024 * 1024)
                return BadRequest(new { message = "File size cannot exceed 5MB" });

            // Delete old profile picture if exists
            if (!string.IsNullOrEmpty(user.ProfilePictureUrl))
            {
                var oldPath = Path.Combine(_webHostEnvironment.WebRootPath, user.ProfilePictureUrl.TrimStart('/'));
                if (System.IO.File.Exists(oldPath))
                {
                    try { System.IO.File.Delete(oldPath); } catch { }
                }
            }

            // Generate unique filename
            var fileName = $"{Guid.NewGuid()}{extension}";
            var uploadsFolder = Path.Combine(_webHostEnvironment.WebRootPath, "uploads", "avatars");

            // Create directory if it doesn't exist
            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            var filePath = Path.Combine(uploadsFolder, fileName);

            // Save file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Update user with new profile picture URL
            user.ProfilePictureUrl = $"/uploads/avatars/{fileName}";
            await _userManager.UpdateAsync(user);

            return Ok(new
            {
                message = "Profile picture uploaded successfully",
                profilePictureUrl = user.ProfilePictureUrl
            });
        }

        // DELETE: api/users/avatar
        [HttpDelete("avatar")]
        public async Task<IActionResult> DeleteAvatar()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var user = await _userManager.FindByIdAsync(userId);

            if (user == null)
                return NotFound(new { message = "User not found" });

            if (string.IsNullOrEmpty(user.ProfilePictureUrl))
                return BadRequest(new { message = "No profile picture to delete" });

            // Delete file
            var oldPath = Path.Combine(_webHostEnvironment.WebRootPath, user.ProfilePictureUrl.TrimStart('/'));
            if (System.IO.File.Exists(oldPath))
            {
                try { System.IO.File.Delete(oldPath); } catch { }
            }

            // Clear URL from database
            user.ProfilePictureUrl = null;
            await _userManager.UpdateAsync(user);

            return Ok(new { message = "Profile picture deleted successfully" });
        }

        // GET: api/users
        [HttpGet]
        public async Task<IActionResult> GetUsers([FromQuery] string? search = null)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var query = _context.Users.AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(u =>
                    u.Email.Contains(search) ||
                    (u.FullName != null && u.FullName.Contains(search)));
            }

            var users = await query
                .Where(u => u.Id != userId) // Exclude current user
                .Select(u => new
                {
                    u.Id,
                    u.FullName,
                    u.Email,
                    u.ProfilePictureUrl,
                    u.IsOnline,
                    u.LastSeenAt
                })
                .Take(20)
                .ToListAsync();

            return Ok(users);
        }

        // GET: api/users/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetUser(string id)
        {
            var user = await _userManager.FindByIdAsync(id);

            if (user == null)
                return NotFound(new { message = "User not found" });

            return Ok(new
            {
                user.Id,
                user.FullName,
                user.Email,
                user.ProfilePictureUrl,
                user.IsOnline,
                user.LastSeenAt,
                user.CreatedAt
            });
        }
    }

    public class UpdateProfileModel
    {
        public string? FullName { get; set; }
        public string? Email { get; set; }
    }
}