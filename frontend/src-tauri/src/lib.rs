use std::fs;
use tauri::Manager;

fn decks_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("decks");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn app_data(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

#[tauri::command]
fn save_deck(app: tauri::AppHandle, name: String, content: String) -> Result<(), String> {
    let path = decks_dir(&app)?.join(format!("{name}.deck"));
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_deck(app: tauri::AppHandle, name: String) -> Result<String, String> {
    let path = decks_dir(&app)?.join(format!("{name}.deck"));
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_decks(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let dir = decks_dir(&app)?;
    let mut names = Vec::new();
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if let Some(name) = entry.path().file_stem() {
            if entry.path().extension().is_some_and(|ext| ext == "deck") {
                names.push(name.to_string_lossy().into_owned());
            }
        }
    }
    Ok(names)
}

#[tauri::command]
fn delete_deck(app: tauri::AppHandle, name: String) -> Result<(), String> {
    let path = decks_dir(&app)?.join(format!("{name}.deck"));
    fs::remove_file(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_settings(app: tauri::AppHandle, content: String) -> Result<(), String> {
    let path = app_data(&app)?.join("settings.json");
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_settings(app: tauri::AppHandle) -> Result<String, String> {
    let path = app_data(&app)?.join("settings.json");
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            save_deck,
            load_deck,
            list_decks,
            delete_deck,
            save_settings,
            load_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
