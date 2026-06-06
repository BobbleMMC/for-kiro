/// SafeGuard Watchdog System
/// Injects safety checks into generated code to prevent:
/// 1. Infinite loops (Loop Limiter)
/// 2. NullPointerExceptions (NPE Shield)
/// 3. Thread safety issues (Thread Dispatcher)

/// Inject loop counter to prevent TPS freeze
/// Terminates loop if execution exceeds MAX_ITERATIONS
pub fn inject_loop_limiter(code: &str, max_iterations: u32) -> String {
    let mut output = code.to_string();

    // Find while/for loops and inject counter
    let loop_counter = format!(
        r#"int __loopCounter = 0;
final int __MAX_ITERATIONS = {};
"#,
        max_iterations
    );

    let loop_check = r#"if (++__loopCounter > __MAX_ITERATIONS) {
                LOGGER.warn("Loop execution limit reached! Terminating to prevent TPS freeze.");
                break;
            }
"#;

    // Inject into while loops
    if output.contains("while (") || output.contains("while(") {
        output = output.replacen("while (", &format!("{}\n        while (", loop_counter), 1);
        // Add check inside loop body
        output = output.replacen(") {\n", &format!(") {{\n            {}", loop_check), 1);
    }

    // Inject into for loops
    if output.contains("for (") || output.contains("for(") {
        let check_line = format!("            {}", loop_check);
        output = output.replacen(") {\n", &format!(") {{\n{}", check_line), 1);
    }

    output
}

/// Wrap entity/player references in null checks
/// Prevents NullPointerException crashes
pub fn inject_npe_shield(code: &str) -> String {
    let mut output = code.to_string();

    // Common patterns that need null checking
    let patterns = vec![
        ("player.", "if (player != null && player.isAlive()) {\n"),
        ("entity.", "if (entity != null && entity.isAlive()) {\n"),
        ("target.", "if (target != null && target.isAlive()) {\n"),
        ("level.", "if (level != null) {\n"),
    ];

    for (pattern, guard) in &patterns {
        if output.contains(pattern) && !output.contains(&format!("if ({}", pattern.trim_end_matches('.'))) {
            // Find lines with the pattern and wrap them
            let lines: Vec<String> = output.lines().map(String::from).collect();
            let mut new_lines = Vec::new();

            for line in &lines {
                let trimmed = line.trim();
                if trimmed.contains(pattern) && !trimmed.starts_with("if") && !trimmed.starts_with("//") {
                    let indent = line.len() - line.trim_start().len();
                    let pad = " ".repeat(indent);
                    new_lines.push(format!("{}{}", pad, guard));
                    new_lines.push(format!("    {}", line));
                    new_lines.push(format!("{}}}", pad));
                } else {
                    new_lines.push(line.clone());
                }
            }

            output = new_lines.join("\n");
        }
    }

    output
}

/// Wrap client-thread GUI actions into server-side queue
/// Prevents concurrent modification issues
pub fn inject_thread_dispatcher(code: &str, method_name: &str) -> String {
    if !code.contains("// CLIENT_THREAD") {
        return code.to_string();
    }

    let dispatcher = format!(
        r#"
        // Thread-safe dispatch: queued from client render thread to server
        event.enqueueWork(() -> {{
            {}
        }});
"#,
        method_name
    );

    code.replace("// CLIENT_THREAD", &dispatcher)
}

/// Apply all safeguards to generated code
pub fn apply_all_safeguards(code: &str) -> String {
    let result = inject_loop_limiter(code, 10_000);
    let result = inject_npe_shield(&result);
    let result = inject_thread_dispatcher(&result, "executeServerSide");
    result
}
