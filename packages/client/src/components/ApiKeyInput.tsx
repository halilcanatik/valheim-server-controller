interface ApiKeyInputProps {
  apiKey: string;
  onChange: (key: string) => void;
  onSave: () => void;
}

export const ApiKeyInput = ({ apiKey, onChange, onSave }: ApiKeyInputProps) => (
  <form
    className="mb-4"
    onSubmit={(event) => {
      event.preventDefault();
      onSave();
    }}
  >
    <label htmlFor="apiKey" className="form-label fw-semibold">
      <i className="bi bi-key-fill me-2"></i>
      API Key (Server Password)
    </label>
    <div className="input-group">
      <input
        id="apiKey"
        type="password"
        className="form-control"
        placeholder="Enter your API key (Server Password)"
        value={apiKey}
        onChange={(e) => onChange(e.target.value)}
      />
      <button className="btn btn-primary" type="submit" disabled={!apiKey}>
        <i className="bi bi-save-fill"></i>
      </button>
    </div>
  </form>
);
