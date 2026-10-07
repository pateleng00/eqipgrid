package com.equipgrid.auth.service;

import com.equipgrid.auth.dto.request.CreateUserRequest;
import com.equipgrid.auth.dto.request.UpdateUserRequest;
import com.equipgrid.auth.dto.response.UserResponse;
import com.equipgrid.auth.entity.User;
import com.equipgrid.auth.enums.Role;
import com.equipgrid.auth.repository.UserQueryRepository;
import com.equipgrid.auth.repository.UserRepository;
import com.equipgrid.common.Exceptions;
import com.equipgrid.location.entity.Hub;
import com.equipgrid.location.repository.HubRepository;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@AllArgsConstructor
public class UserServiceImpl implements IUserService {

    private final UserRepository userRepository;
    private final UserQueryRepository userQueryRepository;
    private final HubRepository hubRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers(User caller, Long hubId, Role role) {
        Role callerRole = resolveCallerRole(caller);
        List<User> users;

        if (callerRole == Role.MANAGER) {
            // Manager is strictly scoped to their assigned hub
            Long callerHubId = getCallerHubId(caller);
            if (callerHubId == null) {
                throw new Exceptions.BusinessRuleViolationException("Manager does not have an assigned Hub Yard");
            }
            users = userQueryRepository.fetchByHubId(callerHubId);
        } else {
            // ROOT and ADMIN can see all users, or filter by hub
            if (hubId != null) {
                users = userQueryRepository.fetchByHubId(hubId);
            } else {
                users = userQueryRepository.fetchAll();
            }
        }

        if (role != null) {
            users = users.stream().filter(u -> u.getRole() == role).collect(Collectors.toList());
        }

        return users.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id, User caller) {
        User user = userQueryRepository.fetchById(id)
                .orElseThrow(() -> new Exceptions.ResourceNotFoundException("User not found with id: " + id));

        validateManagerHubAccess(caller, user);
        return mapToResponse(user);
    }

    @Override
    @Transactional
    public UserResponse createUser(CreateUserRequest request, User caller) {
        Role callerRole = resolveCallerRole(caller);
        Role targetRole = request.getRole() != null ? request.getRole() : Role.OPERATOR;

        // RBAC Enforcement on User Creation
        if (callerRole == Role.MANAGER) {
            // Manager can only create staff for their assigned hub
            Long callerHubId = getCallerHubId(caller);
            if (callerHubId == null) {
                throw new Exceptions.BusinessRuleViolationException("Manager does not have an assigned Hub Yard");
            }
            if (targetRole == Role.ROOT || targetRole == Role.ADMIN || targetRole == Role.MANAGER) {
                throw new Exceptions.BusinessRuleViolationException("Hub Managers can only create Yard Operators and Staff for their assigned hub");
            }
            // Force hub to manager's hub
            request.setHubId(callerHubId);
        } else if (callerRole == Role.ADMIN) {
            // Admin can create Managers, Operators, Staff — but cannot create Root or Admins
            if (targetRole == Role.ROOT || targetRole == Role.ADMIN) {
                throw new Exceptions.BusinessRuleViolationException("Admins cannot create Root or Admin accounts. Only Root has this privilege.");
            }
        }
        // ROOT can create any role (Root, Admin, Manager, Operator)

        String username = (request.getUsername() != null && !request.getUsername().trim().isEmpty())
                ? request.getUsername().trim()
                : request.getEmail().trim();

        if (userQueryRepository.existsByUsername(username)) {
            throw new Exceptions.BusinessRuleViolationException("Username or email already in use: " + username);
        }
        if (userQueryRepository.existsByEmail(request.getEmail().trim())) {
            throw new Exceptions.BusinessRuleViolationException("Email address already in use: " + request.getEmail());
        }

        Hub hub = null;
        if (request.getHubId() != null) {
            hub = hubRepository.findById(request.getHubId())
                    .orElseThrow(() -> new Exceptions.ResourceNotFoundException("Hub not found with id: " + request.getHubId()));
        } else if (targetRole == Role.MANAGER) {
            throw new Exceptions.BusinessRuleViolationException("A Hub Yard must be assigned when creating a Manager");
        }

        User user = User.builder()
                .username(username)
                .email(request.getEmail().trim())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .role(targetRole)
                .phone(request.getPhone())
                .hub(hub)
                .active(true)
                .build();

        User saved = userRepository.save(user);
        log.info("Created user {} with role {} by actor {}", saved.getUsername(), saved.getRole(), caller != null ? caller.getUsername() : "SYSTEM");
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public UserResponse updateUser(Long id, UpdateUserRequest request, User caller) {
        Role callerRole = resolveCallerRole(caller);
        User user = userQueryRepository.fetchById(id)
                .orElseThrow(() -> new Exceptions.ResourceNotFoundException("User not found with id: " + id));

        // RBAC Enforcement on User Update
        if (callerRole == Role.MANAGER) {
            validateManagerHubAccess(caller, user);
            if (user.getRole() == Role.ROOT || user.getRole() == Role.ADMIN || user.getRole() == Role.MANAGER) {
                throw new Exceptions.BusinessRuleViolationException("Managers cannot modify Root, Admin, or Manager accounts");
            }
            if (request.getRole() != null && (request.getRole() == Role.ROOT || request.getRole() == Role.ADMIN || request.getRole() == Role.MANAGER)) {
                throw new Exceptions.BusinessRuleViolationException("Managers cannot elevate roles to Manager, Admin, or Root");
            }
            if (request.getHubId() != null && !request.getHubId().equals(getCallerHubId(caller))) {
                throw new Exceptions.BusinessRuleViolationException("Managers cannot transfer staff outside their assigned Hub");
            }
        } else if (callerRole == Role.ADMIN) {
            if (user.getRole() == Role.ROOT) {
                throw new Exceptions.BusinessRuleViolationException("Admins cannot modify Root accounts");
            }
            if (user.getRole() == Role.ADMIN && (caller != null && !caller.getId().equals(user.getId()))) {
                throw new Exceptions.BusinessRuleViolationException("Admins cannot modify other Admin accounts");
            }
            if (request.getRole() != null && request.getRole() == Role.ROOT) {
                throw new Exceptions.BusinessRuleViolationException("Admins cannot grant Root privileges");
            }
        }
        // ROOT can update anyone

        if (request.getFullName() != null && !request.getFullName().trim().isEmpty()) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            String newEmail = request.getEmail().trim();
            if (!newEmail.equalsIgnoreCase(user.getEmail()) && userQueryRepository.existsByEmail(newEmail)) {
                throw new Exceptions.BusinessRuleViolationException("Email address already in use: " + newEmail);
            }
            user.setEmail(newEmail);
        }
        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword().trim()));
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        if (request.getRole() != null) {
            user.setRole(request.getRole());
        }
        if (request.getHubId() != null) {
            Hub hub = hubRepository.findById(request.getHubId())
                    .orElseThrow(() -> new Exceptions.ResourceNotFoundException("Hub not found with id: " + request.getHubId()));
            user.setHub(hub);
        }
        if (request.getActive() != null) {
            user.setActive(request.getActive());
        }

        User updated = userRepository.save(user);
        log.info("Updated user {} by actor {}", updated.getUsername(), caller != null ? caller.getUsername() : "SYSTEM");
        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public void deleteUser(Long id, User caller) {
        Role callerRole = resolveCallerRole(caller);
        User user = userQueryRepository.fetchById(id)
                .orElseThrow(() -> new Exceptions.ResourceNotFoundException("User not found with id: " + id));

        // Prevent self deletion
        if (caller != null && caller.getId() != null && caller.getId().equals(user.getId())) {
            throw new Exceptions.BusinessRuleViolationException("You cannot delete your own account");
        }

        // RBAC Enforcement on User Deletion
        if (callerRole == Role.MANAGER) {
            validateManagerHubAccess(caller, user);
            if (user.getRole() == Role.ROOT || user.getRole() == Role.ADMIN || user.getRole() == Role.MANAGER) {
                throw new Exceptions.BusinessRuleViolationException("Managers cannot delete Manager, Admin, or Root accounts");
            }
        } else if (callerRole == Role.ADMIN) {
            // ADMIN CANNOT DELETE MANAGERS per explicit user requirement:
            // "also crreate magaers update but not delete"
            if (user.getRole() == Role.MANAGER) {
                throw new Exceptions.BusinessRuleViolationException("Admins are not permitted to delete Managers. Only Root has authority to delete Managers.");
            }
            if (user.getRole() == Role.ROOT || user.getRole() == Role.ADMIN) {
                throw new Exceptions.BusinessRuleViolationException("Admins cannot delete Root or other Admin accounts");
            }
        }
        // ROOT can delete anyone (admins, managers, operators, other roots)

        userRepository.delete(user);
        log.info("Deleted user {} (Role: {}) by actor {}", user.getUsername(), user.getRole(), caller != null ? caller.getUsername() : "SYSTEM");
    }

    private Role resolveCallerRole(User caller) {
        if (caller == null || caller.getRole() == null) {
            return Role.ROOT;
        }
        return caller.getRole();
    }

    private Long getCallerHubId(User caller) {
        if (caller == null || caller.getHub() == null) {
            return null;
        }
        return caller.getHub().getId();
    }

    private void validateManagerHubAccess(User caller, User target) {
        Role callerRole = resolveCallerRole(caller);
        if (callerRole == Role.MANAGER) {
            Long callerHubId = getCallerHubId(caller);
            Long targetHubId = target.getHub() != null ? target.getHub().getId() : null;
            if (callerHubId == null || !callerHubId.equals(targetHubId)) {
                throw new Exceptions.BusinessRuleViolationException("Access denied: You can only manage staff within your assigned Hub Yard");
            }
        }
    }

    private UserResponse mapToResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail() != null ? user.getEmail() : user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole())
                .roleTitle(getRoleTitle(user.getRole()))
                .phone(user.getPhone())
                .hubId(user.getHub() != null ? user.getHub().getId() : null)
                .hubName(user.getHub() != null ? user.getHub().getName() : null)
                .hubCode(user.getHub() != null ? user.getHub().getCode() : null)
                .active(user.getActive() != null ? user.getActive() : true)
                .createdAt(user.getCreatedAt())
                .build();
    }

    private String getRoleTitle(Role role) {
        if (role == null) return "Staff";
        return switch (role) {
            case ROOT -> "Root (Super Admin)";
            case ADMIN -> "Operations Administrator";
            case MANAGER -> "Yard & Fleet Manager";
            case OPERATOR -> "Station Booking Operator";
            case TECHNICIAN -> "Yard Technician";
            case DRIVER -> "Logistics Driver";
            case DEALER -> "Channel Partner";
            case CUSTOMER -> "Customer";
            default -> "Staff";
        };
    }
}
