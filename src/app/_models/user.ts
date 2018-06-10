export class User {
    _id: number;
    username: string;
    password: string;
    firstname: string;
    lastname: string;
    date: string;


    projects?: Array<
    {   date: string;
        siteurl: string;
        track_code: string;
        last_train_date?: string; // latest train date
        enable_keyguard_auth_flag: boolean; // used to enable keyguard
        testing_threshold: number; // used at testing
        training_n_components: number; // used at training (and testing)
        training_outlier_min_dt: number; // used at training
        training_outlier_max_dt: number; // used at training
        training_digraph_min_samples: number; // minimum samples digraph for training
        keystroke_code_collect_limit: number; // how often the logging script sends data to the server
    }> = [];

}
