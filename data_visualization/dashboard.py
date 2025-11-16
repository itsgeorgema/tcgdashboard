import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()

st.set_page_config(
    page_title="TCG Dashboard",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.markdown("""
    <style>
    .stApp {
        background-color: #ffffff;
    }
    
    .main .block-container {
        padding-top: 2rem;
        padding-bottom: 2rem;
        max-width: 1400px;
    }
    
    .main-header {
        font-size: 2.75rem;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 0.25rem;
        letter-spacing: -1px;
        line-height: 1.2;
    }
    
    [data-testid="stSidebar"] {
        background-color: #ffffff;
        border-right: 1px solid #e2e8f0;
    }
    
    .filter-section {
        background-color: #ffffff;
        padding: 1.5rem;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        margin-bottom: 2rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    
    .filter-section h3 {
        color: #0f172a;
        font-weight: 600;
        font-size: 1.125rem;
        margin: 0 0 1.25rem 0;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid #e2e8f0;
    }
    
    .stMultiSelect label, .stSelectbox label {
        color: #475569;
        font-weight: 500;
        font-size: 0.875rem;
    }
    
    .stMultiSelect > div {
        background-color: #ffffff;
    }
    
    .stMultiSelect > div > div {
        background-color: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
    }
    
    .stMultiSelect > div > div:hover {
        border-color: #cbd5e1;
    }
    
    .stMultiSelect [data-baseweb="select"] {
        background-color: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
    }
    
    .stMultiSelect [data-baseweb="select"]:hover {
        border-color: #cbd5e1;
    }
    
    .stMultiSelect input,
    .stMultiSelect [data-baseweb="input"] {
        color: #0f172a;
        font-size: 0.875rem;
        background-color: #ffffff;
    }
    
    .stMultiSelect [data-baseweb="tag"],
    .stMultiSelect span[role="button"] {
        background-color: #f1f5f9;
        color: #0f172a;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        font-size: 0.8125rem;
        padding: 0.25rem 0.5rem;
    }
    
    [data-baseweb="popover"] {
        background-color: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    [data-baseweb="menu"] {
        background-color: #ffffff;
    }
    
    [data-baseweb="menu"] li:hover,
    [data-baseweb="option"]:hover {
        background-color: #f8fafc;
    }
    
    [data-baseweb="menu"] li[aria-selected="true"],
    [data-baseweb="option"][aria-selected="true"] {
        background-color: #f1f5f9;
        color: #0f172a;
    }
    
    .stMultiSelect [data-baseweb="input"]::placeholder {
        color: #94a3b8;
    }
    
    .stMetric {
        background-color: #ffffff;
        padding: 1.25rem;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    
    .stMetric label {
        color: #64748b;
        font-size: 0.875rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .stMetric [data-testid="stMetricValue"] {
        color: #0f172a;
        font-weight: 700;
    }
    
    .stMetric [data-testid="stMetricDelta"] {
        font-weight: 500;
    }
    
    .kpi-card {
        background-color: #ffffff;
        padding: 1.5rem;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    
    .kpi-title {
        font-size: 0.8125rem;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 0.75rem;
        font-weight: 600;
    }
    
    .kpi-value {
        font-size: 2rem;
        font-weight: 700;
        color: #0f172a;
    }
    
    h2 {
        color: #0f172a;
        font-weight: 600;
        font-size: 1.5rem;
        margin-top: 2rem;
        margin-bottom: 1rem;
    }
    
    h3 {
        color: #1e293b;
        font-weight: 600;
        font-size: 1.25rem;
        margin-top: 1.5rem;
        margin-bottom: 0.75rem;
    }
    
    .stTabs [data-baseweb="tab-list"] {
        gap: 4px;
        background-color: #f8fafc;
        padding: 4px;
        border-radius: 8px;
    }
    
    .stTabs [data-baseweb="tab"] {
        padding: 12px 24px;
        border-radius: 6px;
        font-weight: 500;
        color: #64748b;
        transition: all 0.2s;
    }
    
    .stTabs [aria-selected="true"] {
        background-color: #ffffff;
        color: #0f172a;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    hr {
        border: none;
        border-top: 1px solid #e2e8f0;
        margin: 2rem 0;
    }
    
    .stSelectbox label, .stMultiSelect label {
        color: #475569;
        font-weight: 500;
        font-size: 0.875rem;
    }
    
    p, div, span, li {
        color: #1e293b;
    }
    
    .stMarkdown, .stText, .element-container {
        color: #1e293b;
    }
    
    .stMarkdown p, .stMarkdown li {
        color: #1e293b;
    }
    
    .stSubheader, .stText {
        color: #1e293b;
    }
    
    .placeholder-box {
        background-color: #f8fafc;
        border: 2px dashed #cbd5e1;
        border-radius: 12px;
        padding: 3rem;
        text-align: center;
        color: #94a3b8;
    }
    
    footer {
        visibility: hidden;
    }
    
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    </style>
""", unsafe_allow_html=True)

COLORS = {
    'primary': '#2563eb',
    'secondary': '#64748b',
    'success': '#10b981',
    'warning': '#f59e0b',
    'error': '#ef4444',
    'info': '#3b82f6',
    'purple': '#8b5cf6',
    'teal': '#14b8a6',
    'orange': '#f97316',
    'gray': '#6b7280'
}

@st.cache_data
def load_projects():
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        st.error("Please set SUPABASE_URL and SUPABASE_KEY in your .env file")
        st.stop()
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        data = supabase.table("project").select("*").execute()
        df = pd.DataFrame(data.data)
        return df
    except Exception as e:
        st.error(f"Error loading project data: {e}")
        return pd.DataFrame()

@st.cache_data
def load_members():
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        return pd.DataFrame()
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        data = supabase.table("member").select("*").execute()
        df = pd.DataFrame(data.data)
        return df
    except Exception as e:
        return pd.DataFrame()

@st.cache_data
def load_companies():
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        return pd.DataFrame()
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        data = supabase.table("company").select("*").execute()
        df = pd.DataFrame(data.data)
        return df
    except Exception as e:
        return pd.DataFrame()

@st.cache_data
def load_gbms():
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        return pd.DataFrame()
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        data = supabase.table("gbm").select("*").execute()
        df = pd.DataFrame(data.data)
        return df
    except Exception as e:
        return pd.DataFrame()

@st.cache_data
def load_attendance():
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        return pd.DataFrame()
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        data = supabase.table("attendance").select("*").execute()
        df = pd.DataFrame(data.data)
        return df
    except Exception as e:
        return pd.DataFrame()

@st.cache_data
def load_assignments():
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        return pd.DataFrame()
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        data = supabase.table("assignment").select("*").execute()
        df = pd.DataFrame(data.data)
        return df
    except Exception as e:
        return pd.DataFrame()

projects_df = load_projects()
members_df = load_members()
companies_df = load_companies()
gbms_df = load_gbms()
attendance_df = load_attendance()
assignments_df = load_assignments()

st.markdown('<h1 class="main-header">TCG Dashboard</h1>', unsafe_allow_html=True)

with st.container():
    st.markdown("""
        <div class="filter-section">
            <h3>Filters</h3>
        </div>
    """, unsafe_allow_html=True)
    
    filter_col1, filter_col2, filter_col3 = st.columns(3)
    
    with filter_col1:
        if not projects_df.empty and 'quarter_id' in projects_df.columns:
            selected_quarters = st.multiselect(
                "Select Quarters",
                options=sorted(projects_df['quarter_id'].unique()) if 'quarter_id' in projects_df.columns else [],
                default=sorted(projects_df['quarter_id'].unique()) if 'quarter_id' in projects_df.columns else [],
                help="Filter data by selected quarters"
            )
        else:
            selected_quarters = []
    
    with filter_col2:
        st.empty()
    
    with filter_col3:
        st.empty()

st.markdown("---")

if not projects_df.empty and 'quarter_id' in projects_df.columns:
    filtered_projects = projects_df[projects_df['quarter_id'].isin(selected_quarters)] if selected_quarters else projects_df
else:
    filtered_projects = projects_df

tab1, tab2, tab3, tab4 = st.tabs([
    "Projects", 
    "Members", 
    "Companies", 
    "GBMs"
])

def placeholder_viz(title="Visualization Placeholder"):
    fig = go.Figure()
    fig.add_annotation(
        text=title,
        xref="paper", yref="paper",
        x=0.5, y=0.5,
        showarrow=False,
        font=dict(size=16, color="#94a3b8")
    )
    fig.update_layout(
        xaxis=dict(showgrid=False, showticklabels=False, zeroline=False),
        yaxis=dict(showgrid=False, showticklabels=False, zeroline=False),
        plot_bgcolor="white",
        paper_bgcolor="white",
        height=400,
        font=dict(color="#0f172a", family="Arial")
    )
    return fig

def style_chart(fig, title_color="#0f172a", bg_color="white"):
    fig.update_layout(
        plot_bgcolor=bg_color,
        paper_bgcolor=bg_color,
        font=dict(
            color="#0f172a",
            family="Arial, sans-serif",
            size=12
        ),
        title=dict(
            font=dict(
                color=title_color,
                size=18,
                family="Arial, sans-serif"
            ),
            x=0.5,
            xanchor='center'
        ),
        xaxis=dict(
            gridcolor="#e2e8f0",
            gridwidth=1,
            linecolor="#cbd5e1",
            tickfont=dict(color="#475569"),
            title=dict(font=dict(color="#475569", size=13))
        ),
        yaxis=dict(
            gridcolor="#e2e8f0",
            gridwidth=1,
            linecolor="#cbd5e1",
            tickfont=dict(color="#475569"),
            title=dict(font=dict(color="#475569", size=13))
        ),
        showlegend=True,
        legend=dict(
            font=dict(color="#475569", size=11),
            bgcolor="rgba(255,255,255,0.8)",
            bordercolor="#e2e8f0",
            borderwidth=1
        )
    )
    return fig

with tab1:
    st.header("Projects Overview")
    
    st.subheader("Key Performance Indicators")
    kpi_col1, kpi_col2, kpi_col3, kpi_col4 = st.columns(4)
    
    with kpi_col1:
        active_projects = len(filtered_projects) if not filtered_projects.empty else 0
        st.metric("Active Projects", active_projects)
    
    with kpi_col2:
        if not filtered_projects.empty and 'project_manager' in filtered_projects.columns:
            if not assignments_df.empty:
                project_team_sizes = assignments_df.groupby('project_id').size()
                avg_team_size = project_team_sizes.mean() if len(project_team_sizes) > 0 else 0
            else:
                avg_team_size = 0
            st.metric("Avg Team Size", f"{avg_team_size:.1f}")
        else:
            st.metric("Avg Team Size", "N/A")
    
    with kpi_col3:
        if not companies_df.empty and not filtered_projects.empty:
            projects_per_company = len(filtered_projects) / len(companies_df) if len(companies_df) > 0 else 0
            st.metric("Projects per Company", f"{projects_per_company:.1f}")
        else:
            st.metric("Projects per Company", "N/A")
    
    with kpi_col4:
        if not filtered_projects.empty and 'donated' in filtered_projects.columns:
            donated_count = filtered_projects['donated'].sum() if 'donated' in filtered_projects.columns else 0
            donated_pct = (donated_count / len(filtered_projects) * 100) if len(filtered_projects) > 0 else 0
            st.metric("Donated Projects", f"{donated_pct:.1f}%")
        else:
            st.metric("Donated Projects", "N/A")
    
    st.markdown("---")
    
    col1, col2 = st.columns(2)
    
    with col1:
        if not filtered_projects.empty and 'quarter_id' in filtered_projects.columns:
            quarter_counts = filtered_projects.groupby('quarter_id').size().reset_index(name='count')
            fig = px.bar(
            quarter_counts,
            x='quarter_id',
                y='count',
                title='Projects per Quarter',
                labels={'count': 'Number of Projects', 'quarter_id': 'Quarter'},
                color='count',
                color_continuous_scale='Blues',
                text='count'
            )
            fig.update_traces(textposition='outside', textfont=dict(color='#0f172a', size=11))
            fig = style_chart(fig)
            fig.update_layout(height=400, showlegend=False)
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.plotly_chart(placeholder_viz("Projects per Quarter"), use_container_width=True)
    
    with col2:
        if not filtered_projects.empty and 'project_manager' in filtered_projects.columns:
            manager_counts = filtered_projects['project_manager'].value_counts().head(10).reset_index()
            manager_counts.columns = ['project_manager', 'count']
            fig = px.bar(
                manager_counts,
                x='count',
                y='project_manager',
                orientation='h',
                title='Top 10 Project Managers',
                labels={'count': 'Number of Projects', 'project_manager': 'Project Manager'},
                color='count',
                color_continuous_scale='Purples',
                text='count'
            )
            fig.update_traces(textposition='outside', textfont=dict(color='#0f172a', size=11))
            fig = style_chart(fig)
            fig.update_layout(height=400, showlegend=False)
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.plotly_chart(placeholder_viz("Top Project Managers"), use_container_width=True)
    
    st.subheader("Additional Metrics")
    metric_col1, metric_col2 = st.columns(2)
    
    with metric_col1:
        st.markdown("""
        <div class="kpi-card">
            <div class="kpi-title">Tech vs Non-Tech Ratio</div>
            <div class="kpi-value">-</div>
        </div>
        """, unsafe_allow_html=True)
    
    with metric_col2:
        st.markdown("""
        <div class="kpi-card">
            <div class="kpi-title">Project Status Distribution</div>
            <div class="kpi-value">-</div>
        </div>
        """, unsafe_allow_html=True)

with tab2:
    st.header("Members Overview")
    
    st.subheader("Key Performance Indicators")
    kpi_col1, kpi_col2, kpi_col3, kpi_col4 = st.columns(4)
    
    with kpi_col1:
        if not members_df.empty:
            total_members = len(members_df)
            st.metric("Total Members", total_members)
        else:
            st.metric("Total Members", "N/A")
    
    with kpi_col2:
        if not members_df.empty and 'role' in members_df.columns:
            associates = len(members_df[members_df['role'].str.contains('Associate', case=False, na=False)])
            analysts = len(members_df[members_df['role'].str.contains('Analyst', case=False, na=False)])
            st.metric("Associates & Analysts", associates + analysts)
        else:
            st.metric("Associates & Analysts", "N/A")
    
    with kpi_col3:
        if not members_df.empty and 'status' in members_df.columns:
            active_members = members_df['status'].sum() if members_df['status'].dtype == bool else len(members_df[members_df['status'] == True])
            st.metric("Active Members", active_members)
        else:
            st.metric("Active Members", "N/A")
    
    with kpi_col4:
        st.metric("Active Associates", "-")
    
    st.markdown("---")
    
    col1, col2 = st.columns(2)
    
    with col1:
        if not members_df.empty and 'role' in members_df.columns:
            role_counts = members_df['role'].value_counts().reset_index()
            role_counts.columns = ['role', 'count']
            fig = px.bar(
                role_counts,
                x='role',
                y='count',
                title='Members by Role',
                labels={'count': 'Number of Members', 'role': 'Role'},
                color='count',
                color_continuous_scale='Teal',
                text='count'
            )
            fig.update_traces(textposition='outside', textfont=dict(color='#0f172a', size=11))
            fig = style_chart(fig)
            fig.update_layout(height=400, showlegend=False)
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.plotly_chart(placeholder_viz("Members by Role"), use_container_width=True)
    
    with col2:
        if not members_df.empty and 'year' in members_df.columns:
            year_counts = members_df['year'].value_counts().reset_index()
            year_counts.columns = ['year', 'count']
            fig = px.bar(
                year_counts,
                x='year',
                y='count',
                title='Members by Year',
                labels={'count': 'Number of Members', 'year': 'Year'},
                color='count',
                color_continuous_scale='Oranges',
                text='count'
            )
            fig.update_traces(textposition='outside', textfont=dict(color='#0f172a', size=11))
            fig = style_chart(fig)
            fig.update_layout(height=400, showlegend=False)
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.plotly_chart(placeholder_viz("Members by Year"), use_container_width=True)
    
    st.subheader("Additional Metrics")
    metric_col1, metric_col2 = st.columns(2)
    
    with metric_col1:
        st.markdown("""
        <div class="kpi-card">
            <div class="kpi-title">Active Associates by Year</div>
            <div class="kpi-value">-</div>
        </div>
        """, unsafe_allow_html=True)
    
    with metric_col2:
        st.markdown("""
        <div class="kpi-card">
            <div class="kpi-title">Recruitment Prediction</div>
            <div class="kpi-value">-</div>
        </div>
        """, unsafe_allow_html=True)

with tab3:
    st.header("Companies Overview")
    
    st.subheader("Key Performance Indicators")
    kpi_col1, kpi_col2, kpi_col3, kpi_col4 = st.columns(4)
    
    with kpi_col1:
        if not companies_df.empty:
            total_companies = len(companies_df)
            st.metric("Total Companies", total_companies)
        else:
            st.metric("Total Companies", "N/A")
    
    with kpi_col2:
        if not filtered_projects.empty and not companies_df.empty:
            projects_per_company = len(filtered_projects) / len(companies_df) if len(companies_df) > 0 else 0
            st.metric("Avg Projects/Company", f"{projects_per_company:.1f}")
        else:
            st.metric("Avg Projects/Company", "N/A")
    
    with kpi_col3:
        if not filtered_projects.empty and 'donated' in filtered_projects.columns:
            donated_pct = (filtered_projects['donated'].sum() / len(filtered_projects) * 100) if len(filtered_projects) > 0 else 0
            st.metric("Donated %", f"{donated_pct:.1f}%")
        else:
            st.metric("Donated %", "N/A")
    
    with kpi_col4:
        st.metric("Project Donated %", "-")
    
    st.markdown("---")
    
    col1, col2 = st.columns(2)
    
    with col1:
        if not filtered_projects.empty and 'company_id' in filtered_projects.columns:
            company_counts = filtered_projects['company_id'].value_counts().head(10).reset_index()
            company_counts.columns = ['company_id', 'count']
            if not companies_df.empty:
                company_counts = company_counts.merge(
                    companies_df[['company_id', 'name']], 
                    on='company_id', 
                    how='left'
                )
                company_counts['label'] = company_counts.apply(
                    lambda x: x['name'] if pd.notna(x['name']) else f"Company {x['company_id']}", 
                    axis=1
                )
            else:
                company_counts['label'] = company_counts['company_id'].astype(str)
            
            fig = px.bar(
                company_counts,
                x='count',
                y='label',
                orientation='h',
                title='Top 10 Companies by Project Count',
                labels={'count': 'Number of Projects', 'label': 'Company'},
                color='count',
                color_continuous_scale='Oranges',
                text='count'
            )
            fig.update_traces(textposition='outside', textfont=dict(color='#0f172a', size=11))
            fig = style_chart(fig)
            fig.update_layout(height=400, showlegend=False)
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.plotly_chart(placeholder_viz("Top Companies"), use_container_width=True)
    
    with col2:
        st.plotly_chart(placeholder_viz("Company Engagement Trends"), use_container_width=True)
    
    st.subheader("Additional Metrics")
    metric_col1, metric_col2 = st.columns(2)
    
    with metric_col1:
        st.markdown("""
        <div class="kpi-card">
            <div class="kpi-title">Projects per Company Distribution</div>
            <div class="kpi-value">-</div>
        </div>
        """, unsafe_allow_html=True)
    
    with metric_col2:
        st.markdown("""
        <div class="kpi-card">
            <div class="kpi-title">Company Engagement Score</div>
            <div class="kpi-value">-</div>
        </div>
        """, unsafe_allow_html=True)

with tab4:
    st.header("General Body Meetings Overview")
    
    st.subheader("Key Performance Indicators")
    kpi_col1, kpi_col2, kpi_col3, kpi_col4 = st.columns(4)
    
    with kpi_col1:
        if not gbms_df.empty:
            total_gbms = len(gbms_df)
            st.metric("Total GBMs", total_gbms)
        else:
            st.metric("Total GBMs", "N/A")
    
    with kpi_col2:
        if not attendance_df.empty and not members_df.empty:
            total_possible = len(attendance_df)
            attended = attendance_df['status'].sum() if 'status' in attendance_df.columns else 0
            attendance_pct = (attended / total_possible * 100) if total_possible > 0 else 0
            st.metric("GBM Attendance", f"{attendance_pct:.1f}%")
        else:
            st.metric("GBM Attendance", "N/A")
    
    with kpi_col3:
        if not attendance_df.empty and not members_df.empty:
            if 'gbm_id' in attendance_df.columns and 'status' in attendance_df.columns:
                gbm_attendance = attendance_df.groupby('gbm_id')['status'].sum()
                avg_attendance = gbm_attendance.mean() if len(gbm_attendance) > 0 else 0
                st.metric("Avg Attendance/GBM", f"{avg_attendance:.1f}")
            else:
                st.metric("Avg Attendance/GBM", "N/A")
        else:
            st.metric("Avg Attendance/GBM", "N/A")
    
    with kpi_col4:
        st.metric("Attendance Prediction", "-")
    
    st.markdown("---")
    
    col1, col2 = st.columns(2)
    
    with col1:
        if not gbms_df.empty and 'quarter_id' in gbms_df.columns:
            gbm_counts = gbms_df.groupby('quarter_id').size().reset_index(name='count')
            fig = px.bar(
                gbm_counts,
                x='quarter_id',
                y='count',
                title='GBMs per Quarter',
                labels={'count': 'Number of GBMs', 'quarter_id': 'Quarter'},
                color='count',
                color_continuous_scale='Greens',
                text='count'
            )
            fig.update_traces(textposition='outside', textfont=dict(color='#0f172a', size=11))
            fig = style_chart(fig)
            fig.update_layout(height=400, showlegend=False)
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.plotly_chart(placeholder_viz("GBMs per Quarter"), use_container_width=True)
    
    with col2:
        if not attendance_df.empty and 'gbm_id' in attendance_df.columns and 'status' in attendance_df.columns:
            gbm_attendance = attendance_df.groupby('gbm_id')['status'].sum().reset_index()
            gbm_attendance.columns = ['gbm_id', 'attended']
            fig = px.line(
                gbm_attendance,
                x='gbm_id',
                y='attended',
                markers=True,
                title='Attendance Trend by GBM',
                labels={'attended': 'Number Attended', 'gbm_id': 'GBM ID'},
                color_discrete_sequence=[COLORS['primary']]
            )
            fig.update_traces(
                line=dict(width=3),
                marker=dict(size=8, line=dict(width=1, color='white'))
            )
            fig = style_chart(fig)
            fig.update_layout(height=400, showlegend=False)
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.plotly_chart(placeholder_viz("Attendance Trend"), use_container_width=True)
    
    st.subheader("Additional Metrics")
    metric_col1, metric_col2 = st.columns(2)
    
    with metric_col1:
        st.markdown("""
        <div class="kpi-card">
            <div class="kpi-title">% of Members Attending GBMs</div>
            <div class="kpi-value">-</div>
        </div>
        """, unsafe_allow_html=True)
    
    with metric_col2:
        st.markdown("""
        <div class="kpi-card">
            <div class="kpi-title">Attendance Prediction Model</div>
            <div class="kpi-value">-</div>
        </div>
        """, unsafe_allow_html=True)